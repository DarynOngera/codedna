#!/usr/bin/env bash
# Runs the Astro dev server and the contact API together for local development.
set -euo pipefail

cleanup() {
  trap - EXIT
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

npm run dev &
npm run dev:api &
wait
