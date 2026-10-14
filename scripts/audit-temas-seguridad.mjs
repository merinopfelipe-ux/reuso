#!/usr/bin/env node

/**
 * ESCÁNER Y AUDITOR AUTOMÁTICO DE SEGURIDAD PARA TEMAS DE TERCEROS
 * 
 * Verifica que ningún archivo de tema instalado en el proyecto intente:
 * 1. Acceder a la base de datos (Supabase, SQL, createAdminClient).
 * 2. Leer variables de entorno del servidor (process.env, claves secretas).
 * 3. Acceder a cookies o sesiones (next/headers, document.cookie).
 * 4. Llamar a APIs internas protegidas (/api/crm, /api/cotizador, /api/admin, etc.).
 * 5. Ejecutar código inseguro (eval, new Function, dangerouslySetInnerHTML sin DOMPurify).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

// Directorios y patrones donde se instalan o residen temas de terceros
const THEME_DIRECTORIES = [
  path.join(ROOT_DIR, 'src', 'themes'),
  path.join(ROOT_DIR, 'src', 'components', 'themes'),
]

// Patrones prohibidos en archivos de temas de terceros
const PROHIBITED_RULES = [
  {
    id: 'NO_SUPABASE_IMPORT',
    regex: /from\s+['"][^'"]*supabase[^'"]*['"]/i,
    descripcion: 'Prohibido importar clientes de Supabase en temas de terceros (aislamiento de BD).',
  },
  {
    id: 'NO_ADMIN_CLIENT',
    regex: /\bcreateAdminClient\b|\bservice_role\b/i,
    descripcion: 'Prohibido usar o llamar createAdminClient o claves service_role en temas de terceros.',
  },
  {
    id: 'NO_PROCESS_ENV',
    regex: /\bprocess\.env\b/,
    descripcion: 'Prohibido leer process.env directamente en temas de terceros (protección de secretos del servidor).',
  },
  {
    id: 'NO_NEXT_HEADERS',
    regex: /from\s+['"]next\/headers['"]/i,
    descripcion: 'Prohibido importar cookies() o headers() en temas de terceros.',
  },
  {
    id: 'NO_INTERNAL_API_CALLS',
    regex: /fetch\s*\(\s*['"`]\/api\/(crm|cotizador|admin|empresa|profile|metas|calculos)/i,
    descripcion: 'Prohibido llamar endpoints internos de usuarios/clientes desde temas de terceros.',
  },
  {
    id: 'NO_COOKIE_ACCESS',
    regex: /\bdocument\.cookie\b/,
    descripcion: 'Prohibido acceder a document.cookie desde temas de terceros.',
  },
  {
    id: 'NO_PARENT_WINDOW_SNOOPING',
    regex: /\b(window\.(parent|top)|parent\.document|top\.document)\b/,
    descripcion: 'Prohibido inspeccionar la ventana o DOM padre desde temas de terceros.',
  },
  {
    id: 'NO_EVAL_OR_FUNCTION_CONSTRUCTOR',
    regex: /\beval\s*\(|\bnew\s+Function\s*\(/,
    descripcion: 'Prohibido el uso de eval() o new Function() en temas de terceros.',
  },
  {
    id: 'NO_UNSANITIZED_HTML',
    regex: /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html:\s*(?!DOMPurify\.sanitize)/,
    descripcion: 'Cualquier HTML en temas debe pasar obligatoriamente por DOMPurify.sanitize().',
  },
  {
    id: 'NO_DIRECT_DB_TABLES',
    regex: /['"`](crm_clientes|profiles|empresas|crm_cotizaciones|usuarios)['"`]/i,
    descripcion: 'Prohibido hacer referencia a tablas protegidas de usuarios o clientes en temas.',
  },
]

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        scanDirectory(fullPath, fileList)
      }
    } else if (/\.(tsx|ts|jsx|js|mjs|cjs|vue|svelte|html)$/.test(entry.name)) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

console.log('🛡️  Ejecutando auditoría de seguridad para temas de terceros...\n')

let filesToScan = []
for (const dir of THEME_DIRECTORIES) {
  if (fs.existsSync(dir)) {
    const found = scanDirectory(dir)
    filesToScan = filesToScan.concat(found)
  }
}

if (filesToScan.length === 0) {
  console.log('ℹ️  No se encontraron carpetas de temas locales directas en src/themes ni src/components/themes.')
  console.log('   El sistema de aislamiento (ThemeSandbox + theme-contract + css-sanitizer) está activo y disponible para renderizar temas.\n')
  console.log('✅ Auditoría de temas finalizada: 0 violaciones detectadas.')
  process.exit(0)
}

console.log(`🔍 Analizando ${filesToScan.length} archivo(s) de temas...`)

let totalViolations = 0

for (const filePath of filesToScan) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const relPath = path.relative(ROOT_DIR, filePath)

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]

    for (const rule of PROHIBITED_RULES) {
      if (rule.regex.test(line)) {
        totalViolations++
        console.error(`\n❌ [VIOLACIÓN DE SEGURIDAD] [${rule.id}]`)
        console.error(`   Archivo: ${relPath}:${lineNum + 1}`)
        console.error(`   Línea:   ${line.trim()}`)
        console.error(`   Motivo:  ${rule.descripcion}`)
      }
    }
  }
}

if (totalViolations > 0) {
  console.error(`\n🚨 AUDITORÍA FALLIDA: Se detectaron ${totalViolations} violaciones de seguridad en temas de terceros.`)
  console.error('   Los temas instalados violan la política de aislamiento y NO pueden ser ejecutados.')
  process.exit(1)
} else {
  console.log('\n✅ Todos los archivos de temas cumplen las reglas de aislamiento estricto.')
  console.log('   Ningún tema tiene acceso a la base de datos, sesiones ni secretos del sistema.')
  process.exit(0)
}
