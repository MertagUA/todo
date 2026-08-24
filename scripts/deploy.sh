#!/bin/bash
# Publishes the built app to GitHub Pages (branch gh-pages) and prints the link.
set -euo pipefail

PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT"

command -v gh >/dev/null || { echo "Потрібен GitHub CLI: brew install gh"; exit 1; }
git rev-parse --git-dir >/dev/null 2>&1 || { echo "Це не git-репозиторій"; exit 1; }

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
OWNER="${REPO%%/*}"
NAME="${REPO##*/}"

# Секрет у зібраному бандлі означав би, що його побачить кожен відвідувач.
if git ls-files --error-unmatch .env .env.local >/dev/null 2>&1; then
  echo "✗ Файл .env або .env.local потрапив під git. Прибери його: git rm --cached .env.local"
  exit 1
fi

echo "==> Збираю"
npm run build >/dev/null

if grep -rqE "sb_secret_|service_role|SUPABASE_SERVICE" dist 2>/dev/null; then
  echo "✗ У зібраному бандлі знайдено секретний ключ. Публікацію скасовано."
  echo "  У .env.local має бути ключ anon / publishable, а не service_role."
  exit 1
fi

echo "==> Публікую у гілку gh-pages репозиторію $REPO"
rm -rf .deploy && mkdir .deploy
cp -R dist/. .deploy/
touch .deploy/.nojekyll          # інакше GitHub ігнорує файли з підкресленням

cd .deploy
git init -q
git checkout -qb gh-pages
git add -A
git -c user.email="deploy@local" -c user.name="deploy" commit -qm "Deploy $(date +%Y-%m-%d-%H%M)"
git push -q -f "https://github.com/$REPO.git" gh-pages
cd "$PROJECT"
rm -rf .deploy

echo "==> Вмикаю GitHub Pages (якщо ще не ввімкнено)"
gh api "repos/$REPO/pages" >/dev/null 2>&1 || \
  gh api -X POST "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || true

echo
echo "Готово. Через 1–2 хвилини застосунок буде тут:"
echo "  https://$OWNER.github.io/$NAME/"
