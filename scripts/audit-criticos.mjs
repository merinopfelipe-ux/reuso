// Falla el CI ante cualquier vulnerabilidad CRÍTICA de npm audit, salvo las
// listadas aquí, que están mitigadas por configuración y no son explotables
// en este despliegue. npm audit no lee next.config.mjs, por eso hace falta
// esta lista. Cada entrada exige motivo: al actualizar a Next 15.5.24 o
// superior, estas dos desaparecen solas y la lista debe quedar vacía.
import { execSync } from 'node:child_process'

const MITIGADAS = {
  'GHSA-2xp9-vwfh-vxw4': 'RCE en Image Optimization con AVIF. next.config.mjs fija images.formats a solo image/webp, AVIF nunca se procesa.',
  'GHSA-p293-qw3h-jr36': 'RCE solo en servidores Windows. Vercel ejecuta en Linux.',
}

let salida
try {
  salida = execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
} catch (e) {
  salida = e.stdout
}

const { vulnerabilities = {} } = JSON.parse(salida)
const criticas = new Map()
for (const [paquete, v] of Object.entries(vulnerabilities)) {
  for (const via of v.via) {
    if (typeof via === 'object' && via.severity === 'critical') {
      const ghsa = via.url.split('/').pop()
      criticas.set(ghsa, `${paquete}: ${via.title}`)
    }
  }
}

const bloqueantes = [...criticas].filter(([ghsa]) => !MITIGADAS[ghsa])
for (const [ghsa, desc] of criticas) {
  if (MITIGADAS[ghsa]) console.log(`Mitigada ${ghsa} (${desc}). Motivo: ${MITIGADAS[ghsa]}`)
}
if (bloqueantes.length) {
  for (const [ghsa, desc] of bloqueantes) console.error(`CRÍTICA sin mitigar ${ghsa}: ${desc}`)
  process.exit(1)
}
console.log(`Sin vulnerabilidades críticas sin mitigar (${criticas.size} mitigadas por configuración).`)
