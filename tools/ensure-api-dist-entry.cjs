const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../apps/api/dist');
const entryFile = path.join(distDir, 'main.js');
const targetRelativePath = './apps/api/src/main.js';
const banner = `// Auto-generated helper to bridge NestJS watcher to the emitted bundle.\n// Do not edit manually.`;
const content = `${banner}\nmodule.exports = require('${targetRelativePath}');\n`;

fs.mkdirSync(distDir, { recursive: true });

const current = fs.existsSync(entryFile) ? fs.readFileSync(entryFile, 'utf8') : '';
if (current.trim() === content.trim()) {
  process.exit(0);
}

fs.writeFileSync(entryFile, content);
