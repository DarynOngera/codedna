#!/usr/bin/env bash
# Idempotent bootstrap for the CODEDNA EC2 instance (Ubuntu 24.04).
#
#   - Installs Nginx, Node.js 22 LTS (NodeSource), and certbot
#   - Creates the non-login `codedna` user and its directories
#   - Installs the Nginx config, systemd units, env template
#   - Serves the site over HTTP at the public IP immediately (no cert needed);
#     issues a Let's Encrypt cert (c0dedna.com + www) via standalone on :80 once
#     DNS points here, then turns on the HTTP->HTTPS upgrade and TLS servers.
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

export DEBIAN_FRONTEND=noninteractive

# Tiny instances (t3.nano = 0.5 GiB) OOM-kill dpkg while unpacking large
# packages like nodejs. Give apt headroom before it does anything heavy.
if [ ! -f /swapfile ] && ! swapon --show | grep -q swapfile; then
  echo "==> adding 2G swap"
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=10 >/dev/null 2>&1 || true

# Repair the interrupted dpkg state left behind by a previous OOM'd run.
dpkg --configure -a || true
apt-get -f install -y || true

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

# Nginx config. c0dedna.conf always parses (HTTP only); the TLS server blocks
# and the HTTP->HTTPS upgrade are toggled via fragments below (written by
# write_nginx_fragments), so the site is served over plain HTTP at the public
# IP even before DNS and the LE cert are live.
install -o root -g root -m 0644 "$REPO_DIR/nginx/c0dedna.conf" /etc/nginx/conf.d/c0dedna.conf
rm -f /etc/nginx/sites-enabled/default
install -d -o root -g root -m 0755 /etc/nginx/codedna

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

# Regenerate the nginx runtime fragments from the current cert state, so the
# config always parses no matter which state we are in.
write_nginx_fragments() {
  install -d -o root -g root -m 0755 /etc/nginx/codedna
  if have_cert; then
    printf 'return 301 https://%s$request_uri;\n' "$DOMAIN" > /etc/nginx/codedna/upgrade.conf
    install -o root -g root -m 0644 "$REPO_DIR/nginx/tls-server.conf" /etc/nginx/codedna/tls-server.conf
  else
    printf '# TLS upgrade inactive until the LE cert (%s) exists.\n' "$DOMAIN" > /etc/nginx/codedna/upgrade.conf
    : > /etc/nginx/codedna/tls-server.conf
  fi
}

reload_nginx() {
  if nginx -t; then
    systemctl enable nginx >/dev/null 2>&1 || true
    systemctl start nginx
    nginx -s reload
    return 0
  fi
  echo "nginx -t: configuration test failed" >&2
  return 1
}

PUB_IP="$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"

write_nginx_fragments

if ! have_cert; then
  if [ -n "$PUB_IP" ] && getent ahostsv4 "$DOMAIN" | awk '{print $1}' | grep -qx "$PUB_IP"; then
    echo "==> issuing Let's Encrypt cert for $DOMAIN + www.$DOMAIN"
    systemctl stop nginx || true   # free :80 for the standalone authenticator
    certbot certonly --standalone --non-interactive --agree-tos --keep-until-expiring \
      -m "$CERT_EMAIL" -d "$DOMAIN" -d "www.$DOMAIN"
    write_nginx_fragments
  else
    echo "WARNING: DNS for $DOMAIN does not point at this host yet." >&2
    echo "  public IP: ${PUB_IP:-unknown} | $DOMAIN resolves to: $(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | head -1)" >&2
    echo "  Serving the site over HTTP at ${PUB_IP:-the public IP} until then." >&2
    echo "  Point an A record at $PUB_IP, then rerun provision (or the workflow)." >&2
  fi
fi

reload_nginx || exit 1

echo "Provisioning complete."
if have_cert; then
  echo "Site: https://$DOMAIN"
else
  echo "Site (HTTP, TLS pending): ${PUB_IP:-<public ip>}"
fi