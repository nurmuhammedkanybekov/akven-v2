# Deployment runbook: updating akven.duckdns.org

A step-by-step checklist for the server that already runs the shop at `https://akven.duckdns.org` (Oracle Cloud
Ubuntu VM, Docker Compose, Caddy, DuckDNS). The background, the choice of server and a first installation from zero
are in [`deployment.md`](deployment.md); this file is what to type, in order, and what you should see.

Conventions: lines starting with `$` run **on the server**, lines starting with `laptop$` run **on your Mac**. Copy
only the command, not the `$`. Do not paste anything from `.env` into a chat, an email or a commit.

---

## Part 1. The first update (the server still runs the 5 November version)

The server does not have `deploy/deploy.sh` yet, so this first update is done by hand. It takes about 10 minutes, most
of it the Docker build. The shop is unavailable for about one minute while the containers restart.

### 1.1 Connect to the server

```sh
laptop$ ssh ubuntu@<server-ip>
```

If you use a separate key: `ssh -i ~/.ssh/<your-key> ubuntu@<server-ip>`. The IP is in the Oracle Cloud console under
*Compute > Instances > your instance > Public IP address*.

### 1.2 Look at the current state before changing anything

```sh
$ cd ~/akven-v2
$ git status
$ git remote -v
$ git log --oneline -1
$ docker compose ps
```

What you should see, and what to do if not:

| Check | Expected | If not |
|---|---|---|
| `git status` | `nothing to commit, working tree clean` | Some file on the server was edited by hand. Run `git diff` and send me the output (it never contains `.env`, which git ignores). Do not continue. |
| `git remote -v` | `origin  https://github.com/nurmuhammedkanybekov/akven-v2` (or the `git@github.com:` form) | If `origin` is the ELTE GitLab, use `nurmss` instead of `dev` in every command below, and add `DEPLOY_BRANCH=nurmss` in front of `sh deploy/deploy.sh` later. |
| `docker compose ps` | three services `db`, `backend`, `web`, all `running (healthy)` | Write down what you see; it is the state to come back to. |

Check that `.env` has the settings a public installation needs, **without printing the values**:

```sh
$ cut -d= -f1 .env | grep -v '^#' | sort
```

The list should include `DB_PASSWORD`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `PUBLIC_URL`,
`CORS_ALLOWED_ORIGINS`, and `AKVEN_BIND` (or rely on its safe default). If `SUPER_ADMIN_EMAIL` is missing, the demo
accounts with the passwords from the README are active on the internet: add it before continuing (Part 4.1).

### 1.3 Back up the database and the photos

```sh
$ sh scripts/backup.sh
$ ls -lh backups/ | tail -3
```

You should see two new files, `akven-<date>.sql.gz` and `akven-media-<date>.tar.gz`, both larger than a few
kilobytes. If the database file is only a few bytes, stop: the backup did not work.

### 1.4 Fetch the new version

```sh
$ git fetch origin dev
$ git log --oneline -1 origin/dev
```

The second line should show the newest commit (at the time of writing `5c17f5a` or later).

If `git fetch` asks for a username and password, the server has no access to the private repository. Create a
read-only deploy key once:

```sh
$ ssh-keygen -t ed25519 -f ~/.ssh/akven_deploy -N ""
$ cat ~/.ssh/akven_deploy.pub
```

Add the printed line on GitHub under *Repository > Settings > Deploy keys > Add deploy key* (leave "Allow write
access" off), then point the checkout at it:

```sh
$ git remote set-url origin git@github.com:nurmuhammedkanybekov/akven-v2.git
$ git config core.sshCommand "ssh -i ~/.ssh/akven_deploy"
$ git fetch origin dev
```

### 1.5 Switch to the new version and rebuild

```sh
$ git checkout --detach origin/dev
$ AKVEN_COMMIT=$(git rev-parse --short HEAD) docker compose up -d --build
```

The build prints many lines and takes 3 to 8 minutes on the Oracle ARM VM. It ends with the three containers
`Started` or `Running`.

### 1.6 Watch the backend start

```sh
$ docker compose logs -f backend
```

Wait for these lines, then press `Ctrl+C` (this only stops following the log, not the shop):

- `Migrating schema "public" to version "41 - stock ledger"`
- `Migrating schema "public" to version "42 - reserve and pay at handover"`
- `Successfully applied 2 migrations`
- `Started AkVenApplication in ... seconds`

If you see `password authentication failed for user "akven"` instead, `DB_PASSWORD` in `.env` no longer matches the
database; see Part 5.

### 1.7 Check that the new version is live

```sh
$ docker compose ps
$ curl -s http://127.0.0.1:8081/api/version
$ curl -s https://akven.duckdns.org/api/version
```

Both `curl` lines must print the same `"commit"` as `git rev-parse --short HEAD`. Then, in a browser (use a private
window, or reload with `Cmd+Shift+R`, because the site caches itself for offline use):

1. `https://akven.duckdns.org` opens; the hero reads *Korean socks for the whole family*.
2. The top bar says *Card payment online is coming soon. Reserve now and pay at the stall.*
3. Put a sock in the bag, go to checkout, choose **Reserve, pay at the stall**, finish the order. The order page shows
   a pickup code and "Kept for you until …".
4. Sign in at `https://akven.duckdns.org/admin` with your super admin. *Orders* shows the order as *Reserved*;
   *Handover* lists it; open a product and check that *Goods arrived* and *Stock history* are there.
5. `https://akven.duckdns.org/sitemap.xml` lists the pages.

If all five work, the update is done. Cancel the test order from its page so it does not hold stock.

---

## Part 2. Automatic updates and nightly backups

From now on `deploy/deploy.sh` does steps 1.3 to 1.7 by itself: it does nothing when `dev` has not moved; otherwise
it backs up, switches to the new commit, rebuilds and waits until `/api/version` reports it.

```sh
$ crontab -e
```

If asked for an editor, choose `nano`. Add these lines at the end (adjust the path if the project is not in
`~/akven-v2`):

```
*/5 * * * * cd $HOME/akven-v2 && sh deploy/deploy.sh >> $HOME/deploy.log 2>&1
30 3 * * * cd $HOME/akven-v2 && sh scripts/backup.sh >> $HOME/backup.log 2>&1
0 4 * * 0 find $HOME/akven-v2/backups -name 'akven-*' -mtime +30 -delete
```

Save with `Ctrl+O`, `Enter`, `Ctrl+X`. The lines mean: check for a new version every 5 minutes; back up every night
at 03:30 server time (UTC on Oracle, 09:30 in Bishkek); every Sunday delete backups older than 30 days so the disk
does not fill up.

Check that it works after the next push to `dev`:

```sh
$ tail -20 ~/deploy.log
```

You should see `deploying <commit> from dev`, then `live: <commit>`. If the remote is GitLab (see 1.2), the first
line must be `cd $HOME/akven-v2 && DEPLOY_BRANCH=nurmss sh deploy/deploy.sh ...`.

To update by hand at any time: `cd ~/akven-v2 && sh deploy/deploy.sh`. To rebuild even when nothing changed (for
example after editing `.env`): `sh deploy/deploy.sh --force`.

---

## Part 3. Backups that survive the server

A backup on the same disk does not survive the loss of the VM, and the files contain customer emails and password
hashes. So: encrypt them on the server, and copy them to your own computer.

### 3.1 Encrypt the backups (once, on the server)

```sh
$ openssl rand -base64 32 > ~/.akven-backup-key && chmod 600 ~/.akven-backup-key
$ cat ~/.akven-backup-key
```

Save the printed line in your password manager, then clear the screen (`clear`). **Without this line the backups
cannot be opened**, so it must exist somewhere other than the server. Do not paste it into a chat or an email.

From now on `scripts/backup.sh` (the nightly one and the one before every deploy) saves `*.enc` files. Check:

```sh
$ sh scripts/backup.sh && ls -lh backups/ | tail -2
```

### 3.2 Copy them to your computer

```sh
laptop$ sh scripts/pull-backups.sh ubuntu@<server-ip>
```

It copies only the new files into `~/akven-backups` (a private folder) and prints the newest database backup with its
size. To do it every day at noon without thinking about it, add one line with `crontab -e` on the laptop:

```
0 12 * * * sh $HOME/akven-v2/scripts/pull-backups.sh ubuntu@<server-ip> >> $HOME/akven-backups/pull.log 2>&1
```

(adjust the path to where the project is on the laptop). The laptop must be awake at that time; a missed day is
caught up the next day.

### 3.3 Prove that a backup can be restored (once, and after big changes)

A backup that was never restored is only a hope. On the laptop, with the passphrase from 3.1 saved in a file
`~/akven-backup-key` (the laptop's local shop is replaced by the backup):

```sh
laptop$ cd ~/akven-v2 && docker compose down -v && docker compose up -d db
laptop$ openssl enc -d -aes-256-cbc -pbkdf2 -pass file:$HOME/akven-backup-key -in ~/akven-backups/akven-<date>.sql.gz.enc \
          | gunzip | docker compose exec -T db psql -U akven -d akven
laptop$ docker compose up -d
```

Open `http://localhost:8081`: the orders and products of the server must be there. For a backup made before 3.1 (a
plain `.sql.gz`), leave the `openssl` step out: `gunzip -c <file> | docker compose exec -T db psql -U akven -d akven`.

### 3.4 Be told when the shop is down

Nothing on the server can report that the server itself is gone, so the check has to come from outside. A free
monitor is enough (for example UptimeRobot or Better Stack, both have a free plan):

1. Create an account with the email you actually read.
2. Add a monitor of type **HTTP(s) / keyword**: URL `https://akven.duckdns.org/api/version`, keyword `commit`,
   every 5 minutes.
3. Alert by email (and by Telegram or push, if you want it on the phone).

`/api/version` answers only when Caddy, the web container, the backend and the database connection all work, so one
monitor covers the whole chain. A deploy makes it fail for about a minute; set the alert to fire after 2 failed
checks so deploys do not wake you.

### 3.5 After a reboot

Every container restarts by itself (`restart: unless-stopped` in `docker-compose.yml`), and Docker and Caddy start
with the system. Check once that this is so on your server:

```sh
$ systemctl is-enabled docker caddy
$ sudo reboot
```

Wait two minutes, then `curl -s https://akven.duckdns.org/api/version` from the laptop must answer. Install the
pending security updates at the same time (`sudo apt update && sudo apt upgrade -y` before the reboot).

---

## Part 4. Settings you may need to change

All settings live in `.env` on the server. After any change: `sh deploy/deploy.sh --force`.

```sh
$ nano ~/akven-v2/.env
```

### 4.1 The super admin and the demo accounts

`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (at least 12 characters) and `SUPER_ADMIN_NAME` create your account at
start. While they are set, the `@akven.test` demo accounts are switched off. For the defence or a meeting with the
supervisor, either add `DEMO_ACCOUNTS=on` for that day, or better, create an account for the examiner under
*Admin > Accounts* and switch it off afterwards.

### 4.2 Demo mode or the real shop

`SPRING_PROFILES_ACTIVE=demo` gives the demo catalogue and the test wallet; this is right for the thesis. For the
real shop later: `SPRING_PROFILES_ACTIVE=prod` on a **new, empty** database (the demo data is not removed by
switching the profile). Customers can then reserve and pay at handover; online card payment stays off until a payment
provider is connected.

### 4.3 Email

```
PUBLIC_URL=https://akven.duckdns.org
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<the shop's gmail address>
MAIL_PASSWORD=<a Gmail app password, not the account password>
MAIL_FROM=<the same address>
```

The app password is created in the Google account under *Security > 2-Step Verification > App passwords*. Emails
written while the mail server was not set up wait under *Admin > Emails to customers* and can be sent again from there.

### 4.4 The real contacts

`SHOP_CONTACTS` holds the real WhatsApp, Telegram and phone (format in `.env.example`). They are set only on the
server, never in the repository.

### 4.5 The language model (optional)

`LLM_API_KEY=<key>` and, in the admin under *AI assistant*, switch the negotiator to the language model. Without a key
the rule-based assistant answers, which is fine for the demonstration.

---

## Part 5. When something goes wrong

| What you see | Cause | What to do |
|---|---|---|
| The site shows the page but no products; the browser console or `docker compose logs web` shows `502` | The backend is not running | `docker compose logs backend --tail 80` and look for the first `ERROR` line |
| `password authentication failed for user "akven"` | `DB_PASSWORD` in `.env` differs from the one the database was created with (PostgreSQL keeps the first one) | Set the database to the `.env` value without printing it: `PW=$(grep '^DB_PASSWORD=' .env \| cut -d= -f2- \| tr -d '"'"'"); docker compose exec -T db psql -U akven -d akven -c "ALTER USER akven PASSWORD '$PW';"; unset PW`, then `docker compose up -d` |
| The build stops with `Killed` or `exit code 137` | Out of memory during the Java build | Add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' \| sudo tee -a /etc/fstab`, then build again |
| `no space left on device` | Old Docker images and build cache | `docker system df`, then `docker image prune -af && docker builder prune -af` (the database and photos are in volumes and are not touched) |
| The browser says the connection is not secure, or the site does not open at all | Caddy cannot get or renew the certificate, or the ports are closed | `sudo systemctl status caddy` and `sudo journalctl -u caddy --since "1 hour ago"`. Ports 80 and 443 must be open both in the Oracle *security list* and on the VM: `sudo iptables -L INPUT -n \| grep -E '80\|443'` |
| The domain points nowhere | The VM's public IP changed (it can after the VM is stopped) or DuckDNS was not updated | Compare `curl -s ifconfig.me` on the server with the IP on duckdns.org and update it there |
| `deploy.sh` says `another deploy is running` | A previous run is still building | Wait; it ends by itself. If a run was interrupted: `rm -f /tmp/akven-deploy.lock` |
| `deploy.sh` says `the shop did not come back with <commit>` | The new version failed to start | `docker compose logs backend --tail 80`. To go back to the last working version, see Part 6 |
| Nobody can sign in to the admin (the password is lost, or `SUPER_ADMIN_PASSWORD` in `.env` was changed and "does not work") | `.env` only creates the super admin the first time; after that the password lives in the database | `sh scripts/reset-admin-password.sh <the account's email>` asks for a new password (hidden) and sets it. To see which accounts exist, without any password: `docker compose exec -T db psql -U akven -d akven -c "select email, role, is_active from app_user where role <> 'CUSTOMER';"` |
| `docker compose logs` shows only the last hours | Each container keeps at most 30 MB of logs, so the disk cannot fill up | Nothing to fix. For an older incident, look at the time in `~/deploy.log` and `~/backup.log` |
| The page looks old after an update | The browser's offline cache | Reload with `Cmd+Shift+R`, or open a private window |

---

## Part 6. Going back to the previous version

Every deploy leaves the checkout on a commit, and `backups/` holds the data from just before it.

```sh
$ cd ~/akven-v2
$ git log --oneline -5 origin/dev
$ git checkout --detach <the previous commit>
$ AKVEN_COMMIT=$(git rev-parse --short HEAD) docker compose up -d --build
```

While you are back on an older commit, disable automatic updates so cron does not move forward again: run
`crontab -e` and put `#` in front of the `deploy.sh` line.

Database migrations only add columns and tables, so an older version normally runs on the newer database. Only if
it refuses to start, restore the data from the backup made just before the update:

```sh
$ docker compose down
$ docker volume ls | grep dbdata
$ docker volume rm <the dbdata volume name>
$ docker compose up -d db
$ gunzip -c backups/akven-<date>.sql.gz | docker compose exec -T db psql -U akven -d akven
$ docker compose up -d
```

If the backup is encrypted (its name ends in `.enc`, see Part 3.1), open it in the same line instead:
`openssl enc -d -aes-256-cbc -pbkdf2 -pass file:$HOME/.akven-backup-key -in backups/akven-<date>.sql.gz.enc | gunzip | docker compose exec -T db psql -U akven -d akven`.

Orders placed between the backup and the restore are lost by this step, so use it only when the shop does not start
otherwise.

---

## Part 7. Before the defence

- [ ] `https://akven.duckdns.org/api/version` shows the commit you expect.
- [ ] An examiner account exists (Part 4.1), or `DEMO_ACCOUNTS=on` is set for the day.
- [ ] A test order can be placed with **Reserve, pay at the stall** and handed over in the admin.
- [ ] The newest backup is on your Mac (Part 3).
- [ ] The local copy runs on the Mac (`docker compose up`, `http://localhost:8081`) as a fallback if the room has no
      internet.
