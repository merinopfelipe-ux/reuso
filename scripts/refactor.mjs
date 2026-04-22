import fs from 'fs';
import path from 'path';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles('./src', []);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  if (file.endsWith('admin.ts') && file.includes('lib/supabase')) {
    if (!content.includes('async function createAdminClient')) {
      content = content.replace("import { createClient } from '@supabase/supabase-js'", 
        "import { createClient } from '@supabase/supabase-js'\nimport { getSecret } from '../infisical.server'");
      content = content.replace('export function createAdminClient() {', 'export async function createAdminClient() {');
      content = content.replace('process.env.SUPABASE_SERVICE_ROLE_KEY!', '(await getSecret("SUPABASE_SERVICE_ROLE_KEY"))');
      changed = true;
    }
  } else {
    if (content.includes('createAdminClient')) {
      if (content.includes('ReturnType<typeof createAdminClient>') && !content.includes('Awaited<ReturnType')) {
        content = content.replace(/ReturnType<typeof createAdminClient>/g, 'Awaited<ReturnType<typeof createAdminClient>>');
        changed = true;
      }
      
      if (content.match(/(?<!await\s)createAdminClient\(\)/)) {
        content = content.replace(/(?<!await\s)createAdminClient\(\)/g, 'await createAdminClient()');
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`✅ Refactored ${file}`);
  }
});
