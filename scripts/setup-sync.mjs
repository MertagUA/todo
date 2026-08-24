/**
 * Writes .env.local with the Supabase keys, so nobody has to create dotfiles by
 * hand. Run it with `npm run setup-sync`, paste the two values when asked, or
 * pass them straight away:  npm run setup-sync -- <url> <key>
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ENV_FILE = join(ROOT, '.env.local')

// Older projects show a JWT ("anon public"), newer ones a publishable key.
const KEY_RE = /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+)$/

function clean(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '')
}

/**
 * Accepts whatever the dashboard put on the clipboard: the API URL, the same
 * URL with a path, a bare hostname, or even the dashboard link — which carries
 * the project ref and can be turned into the API URL.
 */
function normalizeUrl(raw) {
  let value = clean(raw).replace(/\/+$/, '')
  if (!value) return null
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return null
  }

  if (/^(www\.)?supabase\.(com|io)$/i.test(parsed.hostname)) {
    const ref = parsed.pathname.match(/\/project\/([a-z0-9]{16,})/i)
    return ref ? `https://${ref[1]}.supabase.co` : null
  }

  return `https://${parsed.hostname}`   // drops /rest/v1 and friends
}

let [rawUrl, key] = process.argv.slice(2).map(clean)

if (!rawUrl || !key) {
  console.log(`
Де взяти ці два значення
------------------------
1. Відкрий свій проєкт: https://supabase.com/dashboard
2. Ліворуч унизу — шестерня «Project Settings».
3. Пункт «Data API» (у старих дашбордах — просто «API»):
      Project URL   ->  https://щось.supabase.co
4. Пункт «API Keys» (у старих — той самий екран «API», блок «Project API keys»):
      anon / public  або  Publishable key  ->  довгий рядок
   Ключ «service_role» / «secret» НЕ БЕРИ — він дає повний доступ до бази.

Пряме посилання: https://supabase.com/dashboard/project/_/settings/api
`)
}

const rl = !rawUrl || !key ? createInterface({ input: stdin, output: stdout }) : null
if (!rawUrl) rawUrl = clean(await rl.question('Project URL: '))
if (!key) key = clean(await rl.question('anon / publishable key: '))
rl?.close()

const url = normalizeUrl(rawUrl)

if (!url) {
  console.error(`\n✗ Не зрозумів адресу: "${rawUrl}"`)
  console.error('  Підійде будь-що з цього:')
  console.error('    https://abcdefghijklmnop.supabase.co')
  console.error('    abcdefghijklmnop.supabase.co')
  console.error('    https://supabase.com/dashboard/project/abcdefghijklmnop  (посилання з браузера)')
  process.exit(1)
}

if (url !== clean(rawUrl).replace(/\/+$/, '')) {
  console.log(`\nВикористаю: ${url}`)
}

if (!/\.supabase\.(co|in)$/i.test(new URL(url).hostname)) {
  console.log('\n! Це не схоже на стандартний домен Supabase — перевірю звʼязок нижче.')
}
if (!KEY_RE.test(key)) {
  console.error('\n✗ Ключ виглядає дивно. Має починатися з "eyJ" або "sb_publishable_".')
  console.error('  Якщо він починається з "sb_secret" або називається service_role — це не той ключ.')
  process.exit(1)
}
if (/service_role|sb_secret/i.test(key)) {
  console.error('\n✗ Це секретний ключ. Візьми anon / publishable.')
  process.exit(1)
}

// A quick live check beats discovering a typo after a deploy.
process.stdout.write('\nПеревіряю звʼязок з проєктом… ')
try {
  const response = await fetch(`${url}/auth/v1/health`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(10000),
  })
  if (response.ok) {
    console.log('✓ проєкт відповідає')
  } else if (response.status === 401 || response.status === 403) {
    console.log('✗')
    console.error(`\n✗ Проєкт знайдено, але ключ він не приймає (HTTP ${response.status}).`)
    console.error('  Схоже, ключ від іншого проєкту або це не anon/publishable.')
    process.exit(1)
  } else {
    console.log(`? відповів HTTP ${response.status} — записую як є`)
  }
} catch (error) {
  console.log('✗')
  console.error(`\n! Не достукався: ${error.message}`)
  console.error('  Якщо інтернет на місці — перевір адресу. Ключі все одно запишу.')
}

if (existsSync(ENV_FILE)) {
  const previous = readFileSync(ENV_FILE, 'utf8')
  writeFileSync(`${ENV_FILE}.backup`, previous)
  console.log('\nСтарий .env.local збережено як .env.local.backup')
}

writeFileSync(ENV_FILE, `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${key}\n`)

console.log(`
✓ Записав ${ENV_FILE}

Далі:
  npm run deploy     — опублікувати версію із синхронізацією
  npm run dev        — або перевірити локально

Потім у застосунку: значок хмарки ліворуч унизу -> «Створити акаунт».
`)
