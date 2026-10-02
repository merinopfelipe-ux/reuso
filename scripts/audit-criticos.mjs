// Falla el CI ante cualquier vulnerabilidad CRÍTICA de npm audit, salvo las
// listadas aquí, que están mitigadas por configuración y no son explotables
// en este despliegue (npm audit no lee next.config.mjs). Cada entrada exige motivo.
import { execSync } from 'node:child_process'

// Vacía desde la migración a Next 16 (2026-10-02): ya no hay críticas que mitigar.
const MITIGADAS = {}

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
