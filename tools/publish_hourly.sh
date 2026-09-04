#!/usr/bin/env bash
# Hourly live-demo refresh: republish the last committed state of the working branch every hour.
cd "$(dirname "$0")/.."
while true; do
  echo "[$(date -u +'%F %T')] hourly publish"
  FROM_HEAD=1 tools/publish.sh 2>&1 | tail -3
  sleep 3600
done
