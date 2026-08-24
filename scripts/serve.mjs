/**
 * Zero-dependency static server for the built app (dist/).
 * Same port as `npm run dev`, so both share one localStorage origin.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('../dist', import.meta.url)))
const PORT = Number(process.env.PORT || 5173)
const HOST = '127.0.0.1'

/**
 * When launched by Tasks.app (AUTOQUIT=1) the open page pings /__alive every 20s.
 * No ping for IDLE_MS means the window is gone, so the server shuts itself down
 * instead of idling in the background. `npm start` runs without this.
 */
const AUTOQUIT = process.env.AUTOQUIT === '1'
const IDLE_MS = Number(process.env.IDLE_MS || 180000)
let lastSeen = Date.now()

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`)

  lastSeen = Date.now()

  if (url.pathname === '/__alive') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    return res.end('ok')
  }

  // Strip any ../ before touching the filesystem.
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  let file = join(ROOT, rel)

  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(ROOT, 'index.html') // single-page fallback
  }

  try {
    const body = await readFile(file)
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('Not found. Run `npm run build` first.')
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Tasks running at http://localhost:${PORT}${AUTOQUIT ? ' (auto-quits when idle)' : ''}`)
})

if (AUTOQUIT) {
  const timer = setInterval(() => {
    if (Date.now() - lastSeen < IDLE_MS) return
    console.log('No open window for a while — shutting down.')
    clearInterval(timer)
    server.close(() => process.exit(0))
  }, 15000)
  timer.unref?.()
  setTimeout(() => timer.ref?.(), 0)
}
