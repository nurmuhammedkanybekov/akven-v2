#!/usr/bin/env sh
# Run this on YOUR computer, not on the server: it copies the server's backups to a private folder here, so they
# survive the loss of the server. Only new files are copied.
#
#   sh scripts/pull-backups.sh ubuntu@<server-ip>              -> ~/akven-backups
#   sh scripts/pull-backups.sh ubuntu@<server-ip> /some/folder
#
# To do it every day on a Mac or Linux laptop, add to `crontab -e` (adjust the path to the project):
#   0 12 * * * sh $HOME/akven-v2/scripts/pull-backups.sh ubuntu@<server-ip> >> $HOME/akven-backups/pull.log 2>&1
#
# The files contain customer emails and password hashes: keep the folder private, never in git or a shared drive.
set -eu

server=${1:?usage: sh scripts/pull-backups.sh user@server [folder]}
dest=${2:-$HOME/akven-backups}
mkdir -p "$dest"
chmod 700 "$dest"

rsync -az --ignore-existing --include 'akven-*' --exclude '*' "$server:akven-v2/backups/" "$dest/"

newest=$(ls -t "$dest"/akven-*.sql.gz* 2>/dev/null | head -1 || true)
if [ -z "$newest" ]; then echo "No database backup arrived in $dest" >&2; exit 1; fi
echo "$(date +%F\ %R) newest database backup here: $newest ($(wc -c < "$newest" | tr -d ' ') bytes)"
