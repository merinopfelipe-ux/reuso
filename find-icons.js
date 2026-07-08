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
const iconSet = new Set();

files.forEach(file => {
  if (file.includes('src/components/ui/icons.tsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  const regex = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) continue; // is type
    
    const imports = match[2].split(',').map(s => s.trim()).filter(Boolean);
    imports.forEach(imp => {
      if (imp.startsWith('type ') || imp === 'LucideIcon' || imp === 'Icon') return;
      let orig = imp;
      if (imp.includes(' as ')) {
        orig = imp.split(' as ')[0].trim();
      }
      iconSet.add(orig);
    });
  }
});

console.log(Array.from(iconSet).sort().join(', '));
