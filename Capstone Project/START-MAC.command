#!/bin/bash
# K.R. Mangalam University - Campus Events (macOS / Linux launcher)
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js is not installed."
  echo "  Download the LTS version from https://nodejs.org , install it, then run this file again."
  read -r -p "  Press Enter to close…"
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "  First run: installing dependencies. This takes a few minutes…"
  npm install || { read -r -p "  Install failed. Press Enter to close…"; exit 1; }
fi
echo ""
echo "  Starting Campus Events… the browser will open at http://localhost:5180"
echo "  Keep this window open. Press Ctrl+C to stop."
echo ""
( sleep 10; (command -v open >/dev/null && open http://localhost:5180) || xdg-open http://localhost:5180 ) >/dev/null 2>&1 &
npm run dev
