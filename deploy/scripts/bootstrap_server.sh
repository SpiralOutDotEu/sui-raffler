#!/usr/bin/env bash
set -euo pipefail

# Run as root (or with sudo)
# Creates deploy user, installs base, Node LTS, PM2, Nginx, Certbot, UFW, Fail2ban.

adduser --disabled-password --gecos "" deploy || true
usermod -aG sudo deploy

# SSH hardening (key-only; disable root login)
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh || true

apt update
apt install -y nginx git tar unzip ufw fail2ban unattended-upgrades

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Unattended security upgrades
dpkg-reconfigure -plow unattended-upgrades

# Node LTS + PM2 (as deploy user)
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs
su - deploy -c "npm i -g pm2"
su - deploy -c "pm2 startup systemd -u deploy --hp /home/deploy || true"

# App dirs
mkdir -p /var/www/suiraffler-main/{releases,shared}
mkdir -p /var/www/suiraffler-testnet/{releases,shared}
chown -R deploy:deploy /var/www/suiraffler-*

# Place empty envs (owner-only)
su - deploy -c "touch /var/www/suiraffler-main/shared/.env /var/www/suiraffler-testnet/shared/.env"
chmod 600 /var/www/suiraffler-*/shared/.env

# Nginx global hardening
sed -i '/http {/a \  server_tokens off;\n  client_body_timeout 15s;\n  client_header_timeout 15s;\n  keepalive_timeout 30s;\n  send_timeout 15s;\n  add_header X-Content-Type-Options nosniff always;\n  add_header Referrer-Policy strict-origin-when-cross-origin always;\n  add_header X-XSS-Protection "1; mode=block" always;\n  add_header Permissions-Policy "geolocation=(), microphone=()" always;' /etc/nginx/nginx.conf

systemctl reload nginx

echo "Bootstrap complete. Next: render_and_install_nginx.sh, then Certbot certificates."
