// static-server.js
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

const filePath = process.argv[2];
const port = 4200;

if (!filePath || !existsSync(filePath)) {
  console.error(
    '❌ Укажи путь к существующему файлу. Пример: node static-server.js ./data.json'
  );
  process.exit(1);
}

const mimeTypes = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
};

const fileContent = readFileSync(filePath);
const contentType = mimeTypes[extname(filePath)] || 'application/octet-stream';

createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(fileContent),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(fileContent);
}).listen(port, () => {
  console.log(`✅ Static file server started: http://localhost:${port}`);
});
