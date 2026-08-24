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

const URL_RE = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i
// Older projects show a JWT ("anon public"), newer ones a publishable key.
const KEY_RE = /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+)$/

function clean(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '')
}

let [url, key] = process.argv.slice(2).map(clean)

if (!url || !key) {
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

const rl = !url || !key ? createInterface({ input: stdin, output: stdout }) : null
if (!url) url = clean(await rl.question('Project URL: '))
if (!key) key = clean(await rl.question('anon / publishable key: '))
rl?.close()

if (!URL_RE.test(url)) {
  console.error(`\n✗ Project URL виглядає дивно: "${url}"`)
  console.error('  Має бути схоже на https://abcdefghijkl.supabase.co')
  process.exit(1)
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
