// Mahalliy ishga tushirish: statik fayllar + /api/* (Vercel'dagi kabi bitta handler).
// Ishlatish: DATABASE_URL=... TELEGRAM_BOT_TOKEN=... TELEGRAM_BOT_USERNAME=... npm start
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/main');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 8765;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain',
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return handler(req, res);
  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root) || /[\\/](api|node_modules|scripts|test)([\\/]|$)/.test(path.relative(root, file))) {
    res.statusCode = 404;
    return res.end();
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) {
      res.statusCode = 404;
      return fs.createReadStream(path.join(root, '404.html')).pipe(res);
    }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(port, () => console.log(`http://localhost:${port}`));
