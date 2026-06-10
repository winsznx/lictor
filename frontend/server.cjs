const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 4173
const DIST = path.join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

function send(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(data)
  })
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  const resolved = path.normalize(path.join(DIST, urlPath))
  if (!resolved.startsWith(DIST)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  fs.stat(resolved, (err, stat) => {
    if (!err && stat.isFile()) {
      send(res, resolved)
      return
    }
    send(res, path.join(DIST, 'index.html'))
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SPA server listening on 0.0.0.0:${PORT}, serving ${DIST}`)
})
