# Branches, keeping a laptop up to date, and publishing to GitLab

The project lives in two places:

| Remote | Address | Role |
|---|---|---|
| `origin` | GitHub, `nurmuhammedkanybekov/akven-v2` | Day-to-day work and the full CI (tests on PostgreSQL, browser test, Docker check) |
| `gitlab` | ELTE GitLab, `szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed` | The graded copy. Its main branch is `master` |

| Branch | Where | What it holds |
|---|---|---|
| `nurmss` | GitHub and GitLab | Where work happens. Every change lands here first |
| `dev` | GitHub | The main branch on GitHub. Moved forward to `nurmss` once its CI is green |
| `master` | GitLab | The main branch on GitLab, the one the supervisor reviews. Updated from `nurmss` through a merge request |

The rule is simple: **change `nurmss`, check it is green, then move the main branches forward to it.** Because the
main branches only ever move forward to `nurmss`, they never conflict.

All commands below run in a terminal inside the project folder (for example `cd ~/akven-v2`). Paste the command
lines only, not the lines starting with `#`: zsh on macOS does not accept a pasted `#` comment as a command.

## 1. Check that your laptop has the latest version

```bash
git checkout nurmss
git fetch origin
git status
```

`git status` must say:

```
On branch nurmss
Your branch is up to date with 'origin/nurmss'.
nothing to commit, working tree clean
```

What other answers mean:

| `git status` says | What to do |
|---|---|
| `Your branch is behind 'origin/nurmss' by N commits, and can be fast-forwarded` | `git pull origin nurmss` to take the new commits, then run `git status` again |
| `Your branch is ahead of 'origin/nurmss' by N commits` | You have commits that are not on GitHub yet: `git push origin nurmss` |
| `Changes not staged for commit` or `Untracked files` | You changed files on the laptop. Keep them with `git add -A && git commit -m "…"`, or throw them away with `git restore .` (careful: this cannot be undone) |
| `have diverged` | Both sides have new commits. Run `git pull origin nurmss` and follow what it says, or ask before going further |

To be completely sure, compare the newest commit on the laptop with the newest commit on GitHub. These two commands
must print the same commit id:

```bash
git rev-parse HEAD
git rev-parse origin/nurmss
```

You can also compare it with the website: the newest commit id is shown at the top of
https://github.com/nurmuhammedkanybekov/akven-v2/commits/nurmss.

Finally, check that the CI for that commit is green on GitHub: the newest run on
https://github.com/nurmuhammedkanybekov/akven-v2/actions must have a green tick for the same commit.

## 2. Check that the running app is the latest version

Docker keeps old builds, so after pulling, rebuild:

```bash
docker compose up --build
```

If the shop still looks old, rebuild without the cache and start from a clean database:

```bash
docker compose down -v
docker compose build --no-cache
docker compose up
```

`down -v` deletes the demo database, so the demo data is loaded again from scratch. Never use `-v` on a real shop's
database.

Then open http://localhost:8081 and check:

- the top bar has EN · РУС · КЫР, and switching changes the whole page;
- `/visit` shows container 70-E at Dordoi;
- the admin (`admin@akven.test` / `changeme-admin`) has Dashboard, Pricing, Contacts and the stall, and Size chart.

If all three are there, the laptop runs the latest version.

## 3. Publish to GitLab

First make sure the `gitlab` remote exists (once per laptop):

```bash
git remote -v
```

If there is no `gitlab` line, add it:

```bash
git remote add gitlab https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed.git
```

Push the work branch:

```bash
git push gitlab nurmss
```

GitLab runs its own pipeline (`.gitlab-ci.yml`: backend tests with coverage, frontend checks). Wait until it is green:
https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed/-/pipelines

Then bring it into `master` with a merge request, so the supervisor can see what changed:

1. Open https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed/-/merge_requests/new
2. Source branch `nurmss`, target branch `master`.
3. Title, for example "Milestone 3: collections, stock, sizes, pickup, new storefront in three languages".
4. Create it, wait for the pipeline, then merge it.

If you prefer the terminal, and `master` has no commits of its own (it only ever moved forward to `nurmss`), this
does the same without a merge request. It refuses instead of overwriting anything if the branches have diverged:

```bash
git fetch gitlab
git push gitlab nurmss:master
```

## 4. Move GitHub's main branch (`dev`) forward

Only after the CI on `nurmss` is green, and with the laptop up to date (step 1):

```bash
git checkout nurmss
git pull origin nurmss
git push origin nurmss:dev
```

This only succeeds when `dev` can move forward without losing anything; if it refuses, `dev` has commits of its own
and they need to be merged first.

## 5. Check everything is in sync

```bash
git fetch --all
git log -1 --format='%h %s' origin/nurmss
git log -1 --format='%h %s' origin/dev
git log -1 --format='%h %s' gitlab/nurmss
git log -1 --format='%h %s' gitlab/master
```

When all four lines show the same commit, GitHub and GitLab hold exactly the same code.

## Commit authorship

Commits are made under the repository's own identity. Check it once per laptop:

```bash
git config user.name
git config user.email
```
