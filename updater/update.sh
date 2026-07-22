#!/bin/sh
set -u
mkdir -p /updates
touch /updates/update.log
chmod 777 /updates
chmod 666 /updates/update.log
while true; do
  if [ -f /updates/request ]; then
    rm -f /updates/request
    date -u +'%Y-%m-%dT%H:%M:%SZ UPDATE gestartet' >> /updates/update.log
    printf 'running' > /updates/status
    chmod 666 /updates/status
    git config --global --add safe.directory /workspace
    if git -C /workspace fetch origin "${UPDATE_BRANCH:-main}" >> /updates/update.log 2>&1 \
      && git -C /workspace merge --ff-only "origin/${UPDATE_BRANCH:-main}" >> /updates/update.log 2>&1 \
      && docker compose -p "${COMPOSE_PROJECT_NAME:-proxy-manager-deck}" -f /workspace/compose.yml --project-directory /workspace build control gateway demo >> /updates/update.log 2>&1 \
      && docker compose -p "${COMPOSE_PROJECT_NAME:-proxy-manager-deck}" -f /workspace/compose.yml --project-directory /workspace up -d --force-recreate control gateway demo >> /updates/update.log 2>&1; then
      printf 'success' > /updates/status
      date -u +'%Y-%m-%dT%H:%M:%SZ UPDATE erfolgreich' >> /updates/update.log
    else
      printf 'failed' > /updates/status
      date -u +'%Y-%m-%dT%H:%M:%SZ UPDATE fehlgeschlagen' >> /updates/update.log
    fi
  fi
  sleep 3
done
