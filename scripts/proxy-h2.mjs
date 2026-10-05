// Proxy HTTP/2 local para medir Lighthouse como en producción (Vercel sirve
// HTTP/2; `next start` solo HTTP/1.1 y Lighthouse simula ahí 6 descargas
// simultáneas, lo que infla el LCP). Uso, con el build corriendo en :3100:
//   node scripts/proxy-h2.mjs            -> https://localhost:3443
// Lighthouse necesita --chrome-flags="--headless=new --ignore-certificate-errors".
// Para simular la latencia real de Vercel (lo que destapa bloqueos del primer
// pintado que en local no se ven): RETRASO_DOC=350 RETRASO=130 node scripts/proxy-h2.mjs
// Ver skill `seo-rendimiento`.
import http2 from 'node:http2'
import http from 'node:http'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ORIGEN = Number(process.env.ORIGEN_PUERTO || 3100)
const PUERTO = Number(process.env.PUERTO || 3443)
const RETRASO_DOC = Number(process.env.RETRASO_DOC || 0)
const RETRASO = Number(process.env.RETRASO || 0)
const dir = mkdtempSync(join(tmpdir(), 'proxy-h2-'))
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=localhost', '-days', '1',
  '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem')], { stdio: 'ignore' })

const SIN_REENVIAR = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection'])
http2.createSecureServer({ key: readFileSync(join(dir, 'k.pem')), cert: readFileSync(join(dir, 'c.pem')), allowHTTP1: true }, async (req, res) => {
  const esDoc = (req.headers.accept || '').includes('text/html')
  await new Promise((r) => setTimeout(r, esDoc ? RETRASO_DOC : RETRASO))
  const headers = {}
  for (const [k, v] of Object.entries(req.headers)) if (!k.startsWith(':') && !SIN_REENVIAR.has(k)) headers[k] = v
  headers.host = `localhost:${ORIGEN}`
  const p = http.request({ host: '127.0.0.1', port: ORIGEN, path: req.url, method: req.method, headers }, (r) => {
    const out = {}
    for (const [k, v] of Object.entries(r.headers)) if (!SIN_REENVIAR.has(k)) out[k] = v
    res.writeHead(r.statusCode || 502, out)
    r.pipe(res)
  })
  p.on('error', () => { res.writeHead(502); res.end() })
  req.pipe(p)
}).listen(PUERTO, () => console.log(`Proxy HTTP/2 en https://localhost:${PUERTO} -> http://localhost:${ORIGEN}`))
