#!/usr/bin/env sh
# Backs up a Docker Compose installation of the shop: the whole database (orders, products, accounts, settings and
# the installation's signing key) and the uploaded product photos. Run it from the project folder:
#
#   sh scripts/backup.sh            -> backups/akven-YYYY-MM-DD-HHMM.sql.gz and backups/akven-media-YYYY-MM-DD-HHMM.tar.gz
#
# Restore on an empty installation (docker compose up -d db first):
#   gunzip -c backups/akven-<time>.sql.gz | docker compose exec -T db psql -U akven -d akven
#   docker compose run --rm --user 0 -v "$PWD/backups:/backups" --entrypoint sh backend \
#     -c 'tar -xzf /backups/akven-media-<time>.tar.gz -C /data/media'
#
# The files contain customer emails and password hashes: keep them somewhere private, never in the repository.
set -eu

stamp=$(date +%Y-%m-%d-%H%M)
mkdir -p backups

docker compose exec -T db pg_dump -U akven -d akven --no-owner | gzip > "backups/akven-$stamp.sql.gz"
docker compose run --rm --no-deps --user 0 -v "$PWD/backups:/backups" --entrypoint sh backend \
  -c "tar -czf /backups/akven-media-$stamp.tar.gz -C /data/media ."

echo "Saved backups/akven-$stamp.sql.gz and backups/akven-media-$stamp.tar.gz"
