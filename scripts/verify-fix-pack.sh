#!/usr/bin/env bash
set -euo pipefail

echo "→ Building…"
npm run build >/dev/null

echo "→ Starting dev server…"
PORT=${PORT:-3000}
npm run dev -p "$PORT" >/dev/null 2>&1 &
PID=$!
sleep 3

finish() { kill $PID >/dev/null 2>&1 || true; }
trap finish EXIT

echo "→ Checking static assets bypass middleware…"
for path in /favicon.ico /manifest.webmanifest; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT$path")
  echo "  $path → $code"
  [ "$code" = "200" ] || { echo "FAIL: $path not 200"; exit 1; }
done

echo "→ Hitting homepage…"
curl -I "http://localhost:$PORT/en" | head -n 1

echo "✅ Fix Pack verified."
