#!/usr/bin/env sh
# Brings the server up to the latest commit of one branch (dev by default) and rebuilds the shop. Run it from cron
# (every 5 minutes) or by hand; when nothing new has been pushed it does nothing. See docs/deployment.md.
#
#   sh deploy/deploy.sh             update if the branch moved
#   sh deploy/deploy.sh --force     rebuild even if it did not
#
# It never throws local changes away: if the checkout has edits that clash, git refuses and the old version keeps
# running. .env and backups/ are ignored by git and are not touched.
set -eu
cd "$(dirname "$0")/.."

branch=${DEPLOY_BRANCH:-dev}
lock=/tmp/akven-deploy.lock

# One deploy at a time: a slow build must not be started again by the next cron run.
exec 9>"$lock"
if ! flock -n 9; then echo "another deploy is running"; exit 0; fi

git fetch --quiet origin "$branch"
target=$(git rev-parse "origin/$branch")
if [ "$(git rev-parse HEAD)" = "$target" ] && [ "${1:-}" != "--force" ]; then exit 0; fi

echo "$(date -u +%FT%TZ) deploying $(git rev-parse --short "$target") from $branch"
sh scripts/backup.sh                       # new migrations run at start: keep the data from just before them
git checkout --quiet --detach "$target"
commit=$(git rev-parse --short HEAD)
AKVEN_COMMIT=$commit docker compose up -d --build
docker image prune -f >/dev/null

# Wait until the new backend answers and reports the commit we just built.
i=0
until curl -fsS http://127.0.0.1:8081/api/version 2>/dev/null | grep -q "\"$commit\""; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then echo "the shop did not come back with $commit; see: docker compose logs backend"; exit 1; fi
  sleep 5
done
echo "$(date -u +%FT%TZ) live: $commit"
