/* eslint-disable @typescript-eslint/no-require-imports */
// Script de build (se ejecuta con `node`, no se transpila) — CommonJS a propósito.
const fs = require('fs');
const path = require('path');

const FORBIDDEN_COLORS = [
  '#F5FAFA',
  '#F7FAF9',
  '#474747',
  '#525252',
];

const ALLOWED_FILES = [
  'src/app/(auth)/registro/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(public)/status/page.tsx',
  'src/app/(public)/landing2/page.tsx',
  'src/app/cot/[token]/propuesta-client.tsx',
  'src/app/(admin)/admin/qa/page.tsx',
  'src/app/sistema-diseno/page.tsx',
  'src/app/(admin)/admin/empresas/[id]/components/marca-empresa-client.tsx', // Vista previa fija de logo en modo día Y noche a la vez, no sigue el tema de la página
  'src/components/design-system-header.tsx',
  'src/app/globals.css', // Defines variables
  'src/app/page.tsx',    // Public landing
  'src/app/(public)/landing-client.tsx', // Public landing client
  'CLAUDE.md',
  'STATE.md',
];

function checkDirectory(dir) {
  let hasErrors = false;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        if (checkDirectory(fullPath)) {
          hasErrors = true;
        }
      }
    } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css'))) {
      // Check if file is allowed to bypass
      const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
      if (ALLOWED_FILES.includes(relativePath)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for forbidden tailwind background color classes, e.g. bg-[#F5FAFA] or bg-[#474747]
      for (const color of FORBIDDEN_COLORS) {
        const cleanColor = color.toLowerCase();
        
        // Patterns to match: bg-[color], background: 'color' (excluding opacity modifiers like bg-[color]/08)
        const tailwindPattern = new RegExp(`bg-\\[${cleanColor}\\](?!\\/\\d+)`, 'i');
        const inlineStylePattern = new RegExp(`background:\\s*['"]${cleanColor}['"]`, 'i');

        if (tailwindPattern.test(content) || inlineStylePattern.test(content)) {
          console.error(`\x1b[31mError: Found forbidden hardcoded background override ${color} in ${relativePath}\x1b[0m`);
          console.error(`Please use CSS variables like var(--bg-primary), var(--bg-card), or var(--bg-input) instead.`);
          hasErrors = true;
        }
      }

      // Regla de Oro #5 del CLAUDE.md: PROHIBIDO uppercase / text-transform:
      // uppercase en texto visible (labels, botones, badges, headers de
      // tabla). La única excepción es `capitalize` para nombres/roles
      // dinámicos — `uppercase` no tiene excepción. Se revisa aquí porque
      // es una regla que se olvida seguido en las revisiones manuales.
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/toUpperCase|check-backgrounds/.test(line)) return;
        const enClase = /class(Name)?=[^]*\buppercase\b/.test(line) || /\b(?:sm:|md:|lg:|xl:)?uppercase\b/.test(line);
        const enEstilo = /text-transform:\s*uppercase/.test(line) || /textTransform:\s*['"]uppercase['"]/.test(line);
        if (enClase || enEstilo) {
          console.error(`\x1b[31mError: 'uppercase' en ${relativePath}:${i + 1} — prohibido por la Regla de Oro #5 (sin mayúsculas sostenidas). Usa Title Case o Sentence case; si necesitas capitalizar un nombre dinámico usa 'capitalize'.\x1b[0m`);
          hasErrors = true;
        }
      });
    }
  }
  return hasErrors;
}

console.log('Checking for hardcoded backgrounds y mayúsculas sostenidas...');
const errors = checkDirectory(path.join(process.cwd(), 'src'));

if (errors) {
  console.log('\x1b[31mVerification failed. Found forbidden colors in protected routes.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mVerification passed! No forbidden backgrounds found.\x1b[0m');
  process.exit(0);
}
