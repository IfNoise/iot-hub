import fs from 'fs';
import path from 'path';

function fixImports(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');

      // Исправляем относительные импорты
      content = content.replace(
        /from ['"](\.\/.+|\.\.\/[^'"]*)['"]/g,
        (match, importPath) => {
          if (importPath.endsWith('.js')) {
            return match; // Уже исправлено
          }
          return `from '${importPath}.js'`;
        }
      );

      fs.writeFileSync(filePath, content);
      console.log(`Fixed imports in: ${filePath}`);
    }
  }
}

// Запускаем исправление
fixImports('./apps/acm/src');
console.log('All imports fixed!');
