const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_PATH = '/markus';
const OUT_DIR = path.join(__dirname, 'out');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log(`404: ${filePath}`);
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    console.log(`200: ${filePath}`);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let url = req.url;
  
  // Handle _next static files - don't strip basePath
  if (url.startsWith('/_next')) {
    const filePath = path.join(OUT_DIR, url);
    serveFile(filePath, res);
    return;
  }
  
  // Handle root favicon and other static assets
  if (url === '/favicon.ico' || url === '/vercel.svg' || url === '/next.svg' || url === '/file.svg' || url === '/globe.svg' || url === '/window.svg') {
    const filePath = path.join(OUT_DIR, url);
    serveFile(filePath, res);
    return;
  }
  
  // Strip base path if present
  if (url.startsWith(BASE_PATH)) {
    url = url.substring(BASE_PATH.length);
  }
  
  if (url === '') url = '/';
  
  // Try to serve file
  let filePath = path.join(OUT_DIR, url);
  
  // If it's a directory, try index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  // If .html extension missing and file doesn't exist, try adding it
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }
  
  console.log(`Serving: ${req.url} -> ${filePath}`);
  serveFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(`Base path: ${BASE_PATH}`);
  console.log(`Serving from: ${OUT_DIR}`);
});
