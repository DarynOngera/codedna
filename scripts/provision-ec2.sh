#!/usr/bin/env bash
# Idempotent bootstrap for the CODEDNA EC2 instance (Ubuntu 24.04).
#
#   - Installs Nginx, Node.js 22 LTS (NodeSource), and certbot
#   - Creates the non-login `codedna` user and its directories
#   - Installs the Nginx config, systemd units, env template
#   - Issues a Let's Encrypt cert (c0dedna.com + www) when DNS already points
#     here, via the standalone authenticator on :80; otherwise warns and leaves
#     Nginx stopped so a later run (or the CI rerun) finishes the job.
#
# Run as root (or via sudo) from the repo. Safe to re-run.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "run as root (sudo)" >&2
  exit 1
fi

DOMAIN="${DOMAIN:-c0dedna.com}"
CERT_EMAIL="${CERT_EMAIL:-admin@${DOMAIN}}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

apt-get update -y
apt-get install -y curl ca-certificates gnupg nginx rsync certbot

# Node 22 LTS from NodeSource
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Service user
if ! id -u codedna >/dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin codedna
fi

install -d -o codedna -g codedna -m 0755 /opt/codedna
install -d -o root -g root -m 0755 /var/www/codedna
install -d -o root -g root -m 0750 /etc/codedna

# The API always gets a copy of the env template; the real secrets are written
# over it by the deploy CI (from GitHub secrets) right before restart.
install -o root -g codedna -m 0640 "$REPO_DIR/server/.env.example" /etc/codedna/api.env
chmod 600 /etc/codedna/api.env

# Nginx config
install -o root -g root -m 0644 "$REPO_DIR/nginx/c0dedna.conf" /etc/nginx/conf.d/c0dedna.conf
rm -f /etc/nginx/sites-enabled/default

# systemd units
install -o root -g root -m 0644 "$REPO_DIR/systemd/codedna-api.service" /etc/systemd/system/codedna-api.service
install -o root -g root -m 0644 "$REPO_DIR/systemd/codedna-certbot.service" /etc/systemd/system/codedna-certbot.service
install -o root -g root -m 0644 "$REPO_DIR/systemd/codedna-certbot.timer" /etc/systemd/system/codedna-certbot.timer
systemctl daemon-reload
systemctl enable codedna-api
systemctl enable codedna-certbot.timer
systemctl start codedna-certbot.timer || true

have_cert() {
  [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]
}

issue_cert() {
  echo "==> issuing Let's Encrypt cert for $DOMAIN + www.$DOMAIN"
  systemctl stop nginx || true
  certbot certonly --standalone --non-interactive --agree-tos --keep-until-expiring \
    -m "$CERT_EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" \
    --pre-hook 'systemctl stop nginx' \
    --post-hook 'systemctl start nginx' \
    --deploy-hook 'systemctl reload nginx'
}

PUB_IP="$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"

if ! have_cert; then
  if [ -n "$PUB_IP" ] && getent ahostsv4 "$DOMAIN" | awk '{print $1}' | grep -qx "$PUB_IP"; then
    issue_cert
  else
    echo "WARNING: DNS not pointing at this host yet." >&2
    echo "  public IP: ${PUB_IP:-unknown} | $DOMAIN resolves to: $(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | head -1)" >&2
    echo "  Point an A record for $DOMAIN (and www) at $PUB_IP, then rerun provision" >&2
    echo "  or re-trigger the deploy workflow. Nginx is left stopped until then." >&2
    systemctl enable nginx >/dev/null 2>&1 || true
    exit 0
  fi
fi

if have_cert; then
  nginx -t
  systemctl enable nginx
  systemctl restart nginx
else
  echo "WARNING: certificate missing after issuance attempt; leaving Nginx stopped." >&2
  systemctl enable nginx >/dev/null 2>&1 || true
fi

echo "Provisioning complete."
if have_cert; then
  echo "Site: https://$DOMAIN — deploy the app via the GitHub Actions workflow."
else
  echo "Once DNS resolves here, rerun provision (it is idempotent) or rerun the workflow." >&2
fi