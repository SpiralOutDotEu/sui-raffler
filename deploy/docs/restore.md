# Disaster Recovery (Restore)

1. Provision Ubuntu LTS box. `apt update -y`.
2. Run `deploy/scripts/bootstrap_server.sh` as root.
3. Restore backups:
   - `/var/www/suiraffler-main/shared/.env`
   - `/var/www/suiraffler-testnet/shared/.env`
   - `/etc/nginx/` (if customizing beyond templates)
   - `/etc/letsencrypt/` (optional; can reissue)
4. Install site blocks: `deploy/scripts/render_and_install_nginx.sh`.
5. Re-issue certs if needed:
```sh
apt install -y certbot python3-certbot-nginx
certbot --nginx -d suiraffler.xyz -d www.suiraffler.xyz

certbot --nginx -d testnet.suiraffler.xyz -d www.testnet.suiraffler.xyz
```
6. Trigger a GitHub deployment (push on `main` or `testnet`) or manually upload a release.
7. After deploy: `pm2 ls`, open `/api/healthz`.
8. Rollback (if needed):
```sh
su - deploy
ls -1t /var/www/suiraffler-main/releases
ln -sfn /var/www/suiraffler-main/releases/<prev> /var/www/suiraffler-main/current
pm2 reload raffler-prod
```

