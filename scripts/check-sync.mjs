/**
 * Reads the project's public auth settings and says, in Ukrainian, which switch
 * still needs flipping. Run it with `npm run check-sync`.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ENV_FILE = join(ROOT, '.env.local')

if (!existsSync(ENV_FILE)) {
  console.error('✗ Немає .env.local. Спершу: npm run setup-sync')
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync(ENV_FILE, 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const at = line.indexOf('=')
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
    }),
)

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
console.log(`Проєкт: ${url}\n`)

const ok = (text) => console.log(`  ✓ ${text}`)
const bad = (text, fix) => {
  console.log(`  ✗ ${text}`)
  console.log(`      ${fix}`)
  return 1
}

let problems = 0

/* --- auth --- */
try {
  const settings = await (
    await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(10000) })
  ).json()

  console.log('Вхід:')
  if (settings.external?.email) ok('провайдер Email увімкнено')
  else
    problems += bad(
      'провайдер Email вимкнено — увійти неможливо',
      'Authentication → Sign In / Providers → Email → увімкнути перемикач блоку → Save',
    )

  if (!settings.disable_signup) ok('реєстрація дозволена')
  else
    console.log(
      '  ! реєстрація вимкнена — це нормально, якщо створюєш користувачів вручну\n' +
        '      (Authentication → Users → Add user, галочка Auto Confirm User)',
    )

  if (settings.mailer_autoconfirm) ok('підтвердження пошти вимкнено — акаунт працює одразу')
  else
    console.log(
      '  ! «Confirm email» увімкнено — після реєстрації треба підтвердити листа\n' +
        '      Вимкнути: Authentication → Sign In / Providers → Email → Confirm email → Save',
    )
} catch (error) {
  problems += bad(`не вдалося прочитати налаштування входу: ${error.message}`, 'Перевір адресу проєкту й інтернет')
}

/* --- database --- */
try {
  const response = await fetch(`${url}/rest/v1/app_state?select=user_id&limit=1`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(10000),
  })
  console.log('\nБаза:')
  if (response.ok) {
    ok('таблиця app_state існує')
    const rows = await response.json()
    if (Array.isArray(rows) && rows.length === 0) ok('без входу чужих даних не видно (RLS працює)')
    else problems += bad('без входу видно рядки — RLS не налаштовано!', 'Виконай SQL з README, крок 2')
  } else if (response.status === 401 || response.status === 403) {
    ok('таблиця закрита політикою — це правильно')
  } else {
    const body = await response.text()
    problems += bad(`таблиці app_state немає (HTTP ${response.status})`, 'Виконай SQL з README, розділ «Синхронізація», крок 2')
    console.log(`      ${body.slice(0, 160)}`)
  }
} catch (error) {
  problems += bad(`не вдалося перевірити базу: ${error.message}`, 'Перевір інтернет')
}

console.log(problems ? '\nЩе є що поправити — див. ✗ вище.' : '\nУсе готово: можна входити в застосунку.')
process.exit(problems ? 1 : 0)
