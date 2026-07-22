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
    date -u +'%Y-%m-%dT%H:%M:%SZ [1/4] GitHub-Änderungen abrufen' >> /updates/update.log
    if git -C /workspace fetch origin "${UPDATE_BRANCH:-main}" >> /updates/update.log 2>&1; then
      date -u +'%Y-%m-%dT%H:%M:%SZ [2/4] Fast-Forward-Merge prüfen' >> /updates/update.log
    else
      printf 'failed' > /updates/status; date -u +'%Y-%m-%dT%H:%M:%SZ UPDATE fehlgeschlagen: GitHub nicht erreichbar' >> /updates/update.log; continue
    fi
    if git -C /workspace merge --ff-only "origin/${UPDATE_BRANCH:-main}" >> /updates/update.log 2>&1; then
      date -u +'%Y-%m-%dT%H:%M:%SZ [3/4] Docker-Images bauen' >> /updates/update.log
    else
      printf 'failed' > /updates/status; date -u +'%Y-%m-%dT%H:%M:%SZ UPDATE fehlgeschlagen: lokale Änderungen oder Merge-Konflikt' >> /updates/update.log; continue
    fi
    if docker compose -p "${COMPOSE_PROJECT_NAME:-proxy-manager-deck}" -f /workspace/compose.yml --project-directory /workspace build control gateway demo updater >> /updates/update.log 2>&1; then
      date -u +'%Y-%m-%dT%H:%M:%SZ [4/4] Container neu erstellen und Healthcheck abwarten' >> /updates/update.log
    else
      printf 'failed' > /updates/status; date -u +'%Y-%m-%dT%H:%M:%SZ UPDATE fehlgeschlagen: Image-Build' >> /updates/update.log; continue
    fi
    if docker compose -p "${COMPOSE_PROJECT_NAME:-proxy-manager-deck}" -f /workspace/compose.yml --project-directory /workspace up -d --force-recreate control gateway demo >> /updates/update.log 2>&1; then
      printf 'success' > /updates/status
      date -u +'%Y-%m-%dT%H:%M:%SZ UPDATE erfolgreich' >> /updates/update.log
      date -u +'%Y-%m-%dT%H:%M:%SZ Updater wird auf die neue Version umgestellt' >> /updates/update.log
      docker compose -p "${COMPOSE_PROJECT_NAME:-proxy-manager-deck}" -f /workspace/compose.yml --project-directory /workspace up -d --force-recreate updater >> /updates/update.log 2>&1
    else
      printf 'failed' > /updates/status
      date -u +'%Y-%m-%dT%H:%M:%SZ UPDATE fehlgeschlagen' >> /updates/update.log
    fi
  fi
  sleep 3
done
