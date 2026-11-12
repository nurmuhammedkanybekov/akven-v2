#!/usr/bin/env sh
# Sets a new password for one account directly in the database, for the day nobody can sign in to the admin any more.
# (SUPER_ADMIN_PASSWORD in .env only creates the account the first time; changing it later changes nothing.)
# Run it on the server, from the project folder:
#
#   sh scripts/reset-admin-password.sh owner@example.com
#
# It asks for the new password without showing it, and never prints or stores it. Then sign in with it at /admin.
set -eu

email=${1:?usage: sh scripts/reset-admin-password.sh <email of the account>}
case "$email" in *"'"*|*" "*) echo "That is not an email address." >&2; exit 1;; esac

printf 'New password for %s (12 characters or more): ' "$email"
stty -echo; IFS= read -r pw; stty echo; echo
printf 'Once more: '
stty -echo; IFS= read -r pw2; stty echo; echo
if [ "$pw" != "$pw2" ]; then echo "The two do not match. Nothing was changed." >&2; exit 1; fi
if [ "${#pw}" -lt 12 ]; then echo "Too short: 12 characters or more. Nothing was changed." >&2; exit 1; fi

# bcrypt, the same hash the shop itself stores. The password goes in on standard input, not on a command line.
hash=$(printf '%s\n' "$pw" | docker run --rm -i httpd:2.4-alpine htpasswd -niBC 10 x | cut -d: -f2 | tr -d '\r\n')
unset pw pw2
case "$hash" in '$2'*) ;; *) echo "Could not make the password hash. Nothing was changed." >&2; exit 1;; esac

result=$(docker compose exec -T db psql -U akven -d akven -v ON_ERROR_STOP=1 -qtA \
  -c "update app_user set password_hash = '$hash', credentials_changed_at = now() where lower(email) = lower('$email') returning role")
if [ -z "$result" ]; then echo "No account with the email $email. Nothing was changed." >&2; exit 1; fi

# A restart forgets the wrong attempts counted against this account, so the new password works at once.
docker compose restart backend >/dev/null
echo "Password changed for $email ($result). Sign in at /admin in about half a minute."
