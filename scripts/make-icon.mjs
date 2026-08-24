/**
 * Draws the app icon as a 1024px PNG with no image library —
 * signed-distance shapes rasterised by hand, then zlib + PNG chunks.
 * Output: build/icon.png (turned into .icns by scripts/install-app.sh).
 */
import { deflateSync, crc32 } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const S = 1024
const OUT = fileURLToPath(new URL('../build', import.meta.url))

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const mix = (a, b, t) => a + (b - a) * t
/** 1 inside the shape, 0 outside, smooth over ~1.5px. */
const cover = (dist) => clamp01(0.5 - dist / 1.5)

function roundedRect(x, y, w, h, r) {
  const dx = Math.abs(x) - w + r
  const dy = Math.abs(y) - h + r
  const ox = Math.max(dx, 0)
  const oy = Math.max(dy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r
}

function segment(px, py, ax, ay, bx, by, half) {
  const vx = bx - ax
  const vy = by - ay
  const t = clamp01(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy))
  return Math.hypot(px - ax - vx * t, py - ay - vy * t) - half
}

const rgba = Buffer.alloc(S * S * 4)
const CHECK = [
  [0.30, 0.53, 0.455, 0.685],
  [0.455, 0.685, 0.715, 0.335],
]

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const cx = x - S / 2 + 0.5
    const cy = y - S / 2 + 0.5

    // squircle-ish body, macOS-style margin
    const body = cover(roundedRect(cx, cy, S * 0.44, S * 0.44, S * 0.22))

    // vertical gradient indigo -> violet, plus a soft top highlight
    const t = y / S
    let r = mix(0x6b, 0x4f, t)
    let g = mix(0x74, 0x46, t)
    let b = mix(0xff, 0xe0, t)
    const gloss = clamp01(1 - Math.hypot(cx, cy + S * 0.28) / (S * 0.55)) ** 2 * 0.22
    r = mix(r, 255, gloss)
    g = mix(g, 255, gloss)
    b = mix(b, 255, gloss)

    // white check mark
    let mark = 0
    for (const [ax, ay, bx, by] of CHECK) {
      const d = segment(x, y, ax * S, ay * S, bx * S, by * S, S * 0.052)
      mark = Math.max(mark, cover(d))
    }
    r = mix(r, 255, mark)
    g = mix(g, 255, mark)
    b = mix(b, 255, mark)

    const i = (y * S + x) * 4
    rgba[i] = r
    rgba[i + 1] = g
    rgba[i + 2] = b
    rgba[i + 3] = Math.round(body * 255)
  }
}

// raw scanlines: one filter byte (0 = none) per row
const raw = Buffer.alloc(S * (S * 4 + 1))
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0
  rgba.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4)
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8   // bit depth
ihdr[9] = 6   // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'icon.png'), png)
console.log(`icon.png written (${(png.length / 1024).toFixed(0)} KB)`)

// Web-app icons (public/icon-192.png etc.) are generated once from this same
// artwork with `sips -z <size> <size>` and committed — see README.
