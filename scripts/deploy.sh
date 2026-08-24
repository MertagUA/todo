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

echo "==> Збираю"
npm run build >/dev/null

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
