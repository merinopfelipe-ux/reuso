const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        results = results.concat(walkDir(filePath));
      }
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walkDir('./src');
let changed = 0;

files.forEach(file => {
  if (file.includes('src/components/ui/icons.tsx')) return;
  if (file.includes('src/components/ui/brand-logos.tsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  const regex = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
  
  let newContent = content.replace(regex, (match, isTypeInfo, importsStr) => {
    if (isTypeInfo) return match; // skip "import type { ... } from 'lucide-react'"
    
    const imports = importsStr.split(',').map(s => s.trim()).filter(Boolean);
    const types = [];
    const components = [];
    
    imports.forEach(imp => {
      let cleanImp = imp;
      let isType = false;
      if (imp.startsWith('type ')) {
        isType = true;
        cleanImp = imp.substring(5).trim();
      }
      if (isType || cleanImp === 'LucideIcon' || cleanImp === 'Icon') {
        types.push(imp);
      } else {
        components.push(imp);
      }
    });
    
    let result = '';
    if (types.length > 0) {
      result += `import { ${types.join(', ')} } from 'lucide-react'\n`;
    }
    
    if (components.length > 0) {
      result += `import { ${components.join(', ')} } from '@/components/ui/icons'`;
    }
    
    return result.trim();
  });
  
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    changed++;
  }
});

console.log(`Updated ${changed} files.`);
