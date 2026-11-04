# Putting AK&VEN online

## The short answer: localhost, Vercel, or a server?

| Option | What it means for AK&VEN |
|---|---|
| **Localhost** (`docker compose up`) | Right for developing and for the defence: the whole shop runs on one laptop, offline. It is not "safer" for a real shop, only unreachable: no customer can buy. |
| **Vercel** (or Netlify) | Hosts static pages and short serverless functions. The frontend would run there, but the backend is a long-running Spring Boot server with a PostgreSQL database and uploaded photos on disk, and none of that fits. Splitting the frontend (Vercel) from the backend (somewhere else) adds two deployments, two domains and cross-origin requests for nothing. |
| **One small server (recommended)** | The same `docker compose` that CI tests, on a rented Linux server, behind Caddy for automatic HTTPS. About 4–6 EUR a month (for example Hetzner CX22: 2 processors, 4 GB of memory, 40 GB disk). With only 2 GB, add swap (step 3), or building the Java backend runs out of memory. Everything stays in one place. |
| Render, Railway, Fly.io | Possible without managing a server (a Docker service, a managed PostgreSQL and a disk for photos), at a similar or higher price. Their free tiers sleep or expire, so they suit a demo, not a shop. |

## Free, for the thesis and the first months

Everything above can cost nothing:

| Piece | Free choice | Catch |
|---|---|---|
| Server | **Oracle Cloud "Always Free"**: an Ampere (ARM) VM with up to 4 processors and 24 GB of memory, free with no time limit | Sign-up asks for a card to check identity (nothing is charged on Always Free resources); free ARM capacity is sometimes "out of capacity", then try again later or another region. All images the shop uses (PostgreSQL with pgvector, Java, Node, nginx) run on ARM. |
| Or, as a student | **Azure for Students** (100 USD credit a year, no card) or the **GitHub Student Developer Pack** (DigitalOcean credit) | Credit runs out; the Oracle VM does not |
| Domain | **DuckDNS** (`yourname.duckdns.org`), free, works with Caddy's HTTPS | A subdomain, not your own name; a real `.kg` or `.shop` domain can come later |
| HTTPS | Caddy with Let's Encrypt | none |
| Email | The shop's Gmail with an app password (about 500 a day) | Fine for a small shop |
| Monitoring | UptimeRobot free plan | none |

On Oracle Cloud: create a VM with the image **Ubuntu 24.04** and the shape **VM.Standard.A1.Flex** (2 processors and
12 GB is plenty), add your SSH key, and in the VM's *subnet > security list* add ingress rules for TCP 80 and 443
from `0.0.0.0/0`. Oracle's Ubuntu image also has its own firewall rules: run
`sudo iptables -I INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT && sudo netfilter-persistent save`
(use this instead of `ufw` in step 2). On DuckDNS: sign in, create a name, and set its IP to the VM's public IP.
Then follow the steps below unchanged, with `your-domain` = `yourname.duckdns.org`.

## Two kinds of public installation

1. **A public demo for the thesis.** Demo mode (`SPRING_PROFILES_ACTIVE=demo`): the demo catalogue, the simulated wallet
   and the API description. On the internet the demo accounts must be **off**, because their passwords are in the
   README: set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` and they are switched off at start. The super admin then
   adds accounts for the examiners in *Admin > Accounts*.
2. **The real shop.** No demo profile. `PAYMENT_PROVIDER` stays `none` until a payment provider is contracted: the
   checkout then says that online payment is not set up yet, and the shop still works as a catalogue, a fitting room,
   wholesale requests and the price chat.

## Step by step on a server

1. **A domain** (for example a `.kg` domain from a Kyrgyz registrar) with an `A` record pointing at the server.
2. **The server:** Ubuntu 24.04, log in with an SSH key only, and open just the web and SSH ports:
   `sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable`. Turn on automatic security
   updates (`sudo apt install unattended-upgrades`).
3. **Docker** with the compose plugin: `curl -fsSL https://get.docker.com | sudo sh`, then
   `sudo usermod -aG docker $USER` and log in again. On a server with less than 4 GB of memory, add 2 GB of swap:
   `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile &&
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab`.
4. **The code:** `git clone -b dev https://github.com/<owner>/akven-v2.git && cd akven-v2`. A private repository
   needs a read-only *deploy key*: `ssh-keygen -t ed25519 -f ~/.ssh/akven_deploy -N ""`, add the `.pub` file in the
   repository's Settings > Deploy keys, and clone with `GIT_SSH_COMMAND='ssh -i ~/.ssh/akven_deploy' git clone -b dev
   git@github.com:<owner>/akven-v2.git`. Then `cp .env.example .env`, `chmod 600 .env`, and fill in:
   - `DB_PASSWORD`: a long random value, set **before the first start** (the database keeps the first one);
   - `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (at least 12 characters), `SUPER_ADMIN_NAME`;
   - `SHOP_CONTACTS` (the real WhatsApp, Telegram and phone; they never go into the repository);
   - `PUBLIC_URL=https://your-domain` and `CORS_ALLOWED_ORIGINS=https://your-domain`;
   - `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD` (see *Email* below);
   - `SPRING_PROFILES_ACTIVE=demo` for the public demo, or `SPRING_PROFILES_ACTIVE=prod` for the shop. Docker Compose
     starts in demo mode when this is missing, so the real shop must say `prod` (any value but `demo` works);
   - `AKVEN_BIND=127.0.0.1` (the default): only Caddy, on the same server, reaches the shop.
5. **Start:** `docker compose up -d --build`, then `docker compose ps` until all three services are healthy.
6. **HTTPS:** install Caddy (caddyserver.com/docs/install), copy [`deploy/Caddyfile`](../deploy/Caddyfile) to
   `/etc/caddy/Caddyfile`, put your domain in it and `sudo systemctl reload caddy`. Caddy gets the certificate itself.
7. **Check:** open `https://your-domain`, then `https://your-domain/api/shop/info` (it says whether payments are
   `NONE` or `SIMULATED`), and sign in as the super admin.
8. **Backups:** `sh scripts/backup.sh` every night from cron (database and photos into `backups/`), and copy them off
   the server (for example with `rclone` to cloud storage). Restore once on a laptop to be sure it works; the
   script's header shows how.
9. **Updates:** back up, then `git pull && docker compose up -d --build`. Flyway applies new database migrations at
   start.
10. **Watching it:** a free uptime monitor (UptimeRobot, Better Stack) on `https://your-domain/actuator/health`, and
    *Admin > Emails to customers* for emails a mail server refused.

## Email

Without `MAIL_HOST` nothing is sent and every email waits in *Admin > Emails to customers*; "Send again" delivers it
once a server is set up.

- **Gmail** works to start with: turn on 2-step verification for the shop's account, create an *app password*, and
  use `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USERNAME=akven.socks@gmail.com`, `MAIL_PASSWORD=<the app
  password>`. Gmail allows about 500 emails a day.
- For a shop with its own domain, a sending service (Brevo, Mailgun, Amazon SES) delivers more reliably. Add the SPF
  and DKIM records it gives you to the domain, and set `MAIL_FROM` to an address on that domain.

## Payments, honestly

The shop offers **Apple Pay and Google Pay only**; paying with local bank cards and banking apps comes later, once
agreements with the banks exist. Even Apple Pay and Google Pay take real money only through a payment provider
(an acquiring bank or a payment service), which needs a contract and a merchant account. The code is ready for it:
a provider implements `PaymentProvider` (`charge`, `refund`), and `PAYMENT_PROVIDER` chooses it. Until then the real
shop runs with `none`, and the demo with the simulated wallet.

## Security checklist for a public installation

- [ ] HTTPS only, through Caddy; `AKVEN_BIND=127.0.0.1` so the shop is not reachable around it.
- [ ] `.env` readable only by its owner (`chmod 600`); nothing secret in the repository.
- [ ] `SUPER_ADMIN_EMAIL` set, so the demo accounts with public passwords are off.
- [ ] Outside demo mode: `PAYMENT_PROVIDER=none` until a real provider exists, and no `API_DOCS=true`.
- [ ] A long random `DB_PASSWORD`, set before the first start; leave `JWT_SECRET` unset (the shop makes its own key)
      or set 48 random bytes.
- [ ] Nightly backups, copied off the server, and one test restore.
- [ ] Automatic OS updates; `docker compose pull && docker compose up -d --build` now and then for fresh base images.

What the shop does on its own: BCrypt passwords; login tokens refused after a password change or when the account is
switched off; sign-in lockout and sign-up, chat, guest checkout and wholesale limits per visitor; security headers;
CORS for the shop's own address only; uploaded photos checked by their content; prices, discounts and delivery fees
decided by the server only; every change in the admin audited.
