#!/bin/bash
# Builds the app and installs a clickable "Tasks.app" into ~/Applications.
set -euo pipefail

PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="${APP_NAME:-Завдання}"
APP_DIR="$HOME/Applications/$APP_NAME.app"
PORT="${PORT:-5173}"

NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
[ -n "$NODE_BIN" ] || { echo "node not found in PATH"; exit 1; }

echo "==> Building production bundle"
(cd "$PROJECT" && "$NPM_BIN" run build >/dev/null)

echo "==> Drawing icon"
"$NODE_BIN" "$PROJECT/scripts/make-icon.mjs" >/dev/null

ICONSET="$PROJECT/build/icon.iconset"
rm -rf "$ICONSET" && mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  sips -z $size $size "$PROJECT/build/icon.png" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  sips -z $((size * 2)) $((size * 2)) "$PROJECT/build/icon.png" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$PROJECT/build/icon.icns"

echo "==> Creating $APP_DIR"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"
cp "$PROJECT/build/icon.icns" "$APP_DIR/Contents/Resources/icon.icns"

cat > "$APP_DIR/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleDisplayName</key><string>$APP_NAME</string>
  <key>CFBundleIdentifier</key><string>local.tasks.launcher</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST

cat > "$APP_DIR/Contents/MacOS/launcher" <<LAUNCHER
#!/bin/bash
# Starts the local server (if it isn't up yet), then opens the app window.
PROJECT="$PROJECT"
NODE="$NODE_BIN"
NPM="$NPM_BIN"
PORT=$PORT
LAUNCHER
cat >> "$APP_DIR/Contents/MacOS/launcher" <<'LAUNCHER'
URL="http://localhost:$PORT"
LOG="$HOME/Library/Logs/Tasks.log"

fail() {
  osascript -e "display alert \"Tasks\" message \"$1\"" >/dev/null 2>&1
  exit 1
}

alive() { curl -fsS --max-time 1 "$URL/__alive" >/dev/null 2>&1; }
serving() { curl -fsS --max-time 1 "$URL" >/dev/null 2>&1; }

# Rebuild when the source changed since the last build.
if [ -x "$NPM" ]; then
  if [ ! -f "$PROJECT/dist/index.html" ] || [ -n "$(find "$PROJECT/src" -newer "$PROJECT/dist/index.html" -print -quit 2>/dev/null)" ]; then
    (cd "$PROJECT" && "$NPM" run build >>"$LOG" 2>&1) || fail "Build failed. See ~/Library/Logs/Tasks.log"
  fi
fi

# Anything already answering on the port (e.g. `npm run dev`) is good enough.
if ! serving; then
  cd "$PROJECT" || fail "Project folder not found: $PROJECT"
  AUTOQUIT=1 nohup "$NODE" "$PROJECT/scripts/serve.mjs" >>"$LOG" 2>&1 &
  for _ in $(seq 1 40); do alive && break; sleep 0.25; done
  alive || fail "Server did not start. See ~/Library/Logs/Tasks.log"
fi

# Chrome-family browsers can open a window with no tabs or address bar.
for browser in "Google Chrome" "Brave Browser" "Microsoft Edge" "Chromium" "Arc"; do
  if [ -d "/Applications/$browser.app" ]; then
    open -na "$browser" --args --app="$URL"
    exit 0
  fi
done

open "$URL"
LAUNCHER

chmod +x "$APP_DIR/Contents/MacOS/launcher"
touch "$APP_DIR"

echo
echo "Installed: $APP_DIR"
echo "Open it from Spotlight (\"$APP_NAME\") or Finder > Applications, then keep it in the Dock."
