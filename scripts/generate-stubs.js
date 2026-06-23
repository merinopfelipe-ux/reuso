const fs = require('fs')

const content = fs.readFileSync('src/app/(admin)/admin/qa/page.tsx', 'utf-8')
const matches = [...content.matchAll(/id:\s*'([^']+)',\s*categoria:\s*'([^']+)',.*?titulo:\s*'([^']+)'/gs)]

const categories = {}
for (const match of matches) {
  const id = match[1]
  let cat = match[2]
  const title = match[3]
  
  if (cat === 'Autenticación' || cat === 'Páginas Públicas') continue; // Ya los tenemos cubiertos
  
  // Agrupar UI
  if (['Modo Noche', 'Alertas', 'Settings', 'Ayuda'].includes(cat)) {
    cat = 'UI Global'
  }
  
  if (!categories[cat]) categories[cat] = []
  categories[cat].push({ id, title })
}

let idx = 8
for (const [cat, tests] of Object.entries(categories)) {
  const safeCat = cat.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
  const fileName = `e2e/${String(idx).padStart(2, '0')}-${safeCat}.spec.ts`
  
  let fileContent = `import { test, expect } from '@playwright/test'\n\n`
  fileContent += `test.describe('${cat}', () => {\n\n`
  
  for (const t of tests) {
    fileContent += `  test.skip('${t.id} — ${t.title}', async ({ page }) => {\n`
    fileContent += `    // Implementación pendiente para lograr el 100% de blindaje\n`
    fileContent += `  })\n\n`
  }
  
  fileContent += `})\n`
  
  fs.writeFileSync(fileName, fileContent)
  idx++
}

console.log('Test stubs generated!')
