#!/usr/bin/env bash
# Local helper: (re)start `next start` on port 3001 for e2e runs. Kills the previous one
# by process tree (never with pkill -f, which could match the calling shell).
set -euo pipefail
cd "$(dirname "$0")/.."
for pid in $(ps -eo pid,args | awk '/next start -p 3001/ && !/awk/ {print $1}'); do
  pkill -P "$pid" 2>/dev/null || true
  kill "$pid" 2>/dev/null || true
done
sleep 1
SITE_URL=http://localhost:3001 nohup pnpm start -p 3001 > /tmp/prod.log 2>&1 &
for _ in $(seq 1 30); do curl -s -o /dev/null http://localhost:3001/ar && break; sleep 1; done
tail -1 /tmp/prod.log
