#!/usr/bin/env bash
set -euo pipefail

# Copy your templated server blocks into /etc/nginx/sites-available and enable them.

cp "$(dirname "$0")/../nginx/suiraffler-main.conf.tmpl" /etc/nginx/sites-available/suiraffler-main
cp "$(dirname "$0")/../nginx/suiraffler-testnet.conf.tmpl" /etc/nginx/sites-available/suiraffler-testnet

ln -sf /etc/nginx/sites-available/suiraffler-main /etc/nginx/sites-enabled/suiraffler-main
ln -sf /etc/nginx/sites-available/suiraffler-testnet /etc/nginx/sites-enabled/suiraffler-testnet

nginx -t
systemctl reload nginx

echo "Nginx sites installed. Run certbot next."
