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
#
# Encryption (recommended on a server): put a long passphrase in a file only you can read, for example
#   openssl rand -base64 32 > ~/.akven-backup-key && chmod 600 ~/.akven-backup-key
# and keep a copy of that passphrase somewhere else (a password manager): without it the backups cannot be opened.
# When the file exists (or BACKUP_KEY_FILE names another one), both files are saved encrypted (AES-256), as *.enc, and
# the readable ones are removed. To open one:
#   openssl enc -d -aes-256-cbc -pbkdf2 -pass file:<key file> -in backups/<file>.enc -out <file>
set -eu

stamp=$(date +%Y-%m-%d-%H%M)
mkdir -p backups

docker compose exec -T db pg_dump -U akven -d akven --no-owner | gzip > "backups/akven-$stamp.sql.gz"
docker compose run --rm --no-deps --user 0 -v "$PWD/backups:/backups" --entrypoint sh backend \
  -c "tar -czf /backups/akven-media-$stamp.tar.gz -C /data/media ."

# An empty or failed dump must not look like a backup: gzip of nothing is about 20 bytes.
if [ "$(wc -c < "backups/akven-$stamp.sql.gz")" -lt 1000 ]; then
  echo "The database backup is empty: backups/akven-$stamp.sql.gz. Is the db container running?" >&2
  exit 1
fi

key=${BACKUP_KEY_FILE:-$HOME/.akven-backup-key}
ext=""
if [ -s "$key" ]; then
  for f in "backups/akven-$stamp.sql.gz" "backups/akven-media-$stamp.tar.gz"; do
    # The media archive is written by the container as root; openssl only needs to read it, and rm works without
    # sudo because the folder is ours.
    openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$key" -in "$f" -out "$f.enc"
    rm -f "$f"
  done
  ext=".enc"
fi

echo "Saved backups/akven-$stamp.sql.gz$ext and backups/akven-media-$stamp.tar.gz$ext"
