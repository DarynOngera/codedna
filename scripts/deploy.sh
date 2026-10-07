#!/usr/bin/env bash
# Deploys CODEDNA to the EC2 instance.
#
#   Usage:  scripts/deploy.sh <user@host>
#   Example: scripts/deploy.sh ubuntu@203.0.113.10
#
#   - Runs local checks (astro check, build, server typecheck + tests, audits)
#   - Rsyncs the static build to a timestamped release and flips a symlink
#   - Rsyncs the server, installs prod deps, restarts the systemd unit
#   - Reloads Nginx
set -euo pipefail

SSH_HOST="${1:?usage: scripts/deploy.sh <user@host>}"
cd "$(dirname "$0")/.."

echo "==> local checks"

npm run check
npm run build
npm run --prefix server typecheck
NODE_ENV=test npm --prefix server test -- --test-reporter=dot
npm audit --omit=dev
npm --prefix server audit --omit=dev

RELEASE="$(date -u +%Y%m%d%H%M%S)"
REMOTE_RELEASE_DIR="/var/www/codedna/releases/$RELEASE"

echo "==> preparing remote release $RELEASE on $SSH_HOST"
ssh "$SSH_HOST" "mkdir -p $REMOTE_RELEASE_DIR /opt/codedna/server"

echo "==> syncing static build"
rsync -az --delete ./dist/ "$SSH_HOST:$REMOTE_RELEASE_DIR/"

echo "==> syncing server"
rsync -az --delete \
  --exclude node_modules \
  --exclude .env \
  --exclude test \
  ./server/ "$SSH_HOST:/opt/codedna/server/"

echo "==> activating release + restarting services"
ssh "$SSH_HOST" "
  ln -sfn $REMOTE_RELEASE_DIR /var/www/codedna/current && \
  cd /opt/codedna/server && npm ci --omit=dev && \
  chown -R codedna:codedna /opt/codedna && \
  systemctl restart codedna-api && \
  nginx -t && systemctl reload nginx"

echo "==> smoke test"
sleep 1
DOMAIN="${DOMAIN:-c0dedna.com}"
curl -fsS "https://$DOMAIN/api/health" || echo "DNS/TLS may not be live yet."

echo "==> deployed: $REMOTE_RELEASE_DIR"