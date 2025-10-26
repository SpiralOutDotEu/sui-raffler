# Backups

Back up daily (encrypted, offsite) the following:
- /var/www/suiraffler-main/shared
- /var/www/suiraffler-testnet/shared
- /etc/nginx
- /etc/letsencrypt
- (DB dumps if you use a DB)

Use restic or borg to S3/B2/Wasabi. Example cron (restic):
```sh
0 3 * * * RESTIC_PASSWORD=*** restic -r s3:s3.wasabisys.com/your-bucket backup
/var/www/suiraffler-main/shared
/var/www/suiraffler-testnet/shared
/etc/nginx
/etc/letsencrypt
--tag suiraffler && RESTIC_PASSWORD=*** restic -r s3:s3.wasabisys.com/your-bucket forget --keep-daily 14 --keep-weekly 8 --prune
```
Quarterly: do a test restore.
