const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 4000;
const HOST = '127.0.0.1';
const page = path.join(__dirname, 'index.html');

http
  .createServer((req, res) => {
    if (req.method !== 'GET' || req.url.split('?')[0] !== '/') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(page).pipe(res);
  })
  .listen(PORT, HOST, () => {
    console.log(`Demo origin running on http://localhost:${PORT}`);
  });
