# CODEDNA — c0dedna.com

Software, Cloud & AI for business.

A small, deliberate corporate website for CODEDNA. Static pages (Home, About, Contact,
Apps including PrometheusFC and FinAlgo, and their privacy policies) built with Astro +
Tailwind, plus one tiny Node API for the contact form.

> Status: v0.1. CODEDNA builds apps and provides artificial intelligence, cloud computing
> and IT consulting.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Astro 7 (static output) · Tailwind CSS 4 · TypeScript · ~2 KB client JS |
| Backend | Node 22 (native TS) · Express 5 · express-rate-limit · Resend |
| Infra | One EC2 (Ubuntu 24.04) · Nginx · systemd · Let's Encrypt |

No database, no auth, no CMS, no Terraform, no containers. Contact submissions are
emailed only; nothing is stored.

```
Internet → Nginx (EC2 :80/:443)
              ├── /       → Astro dist/ (static)
              └── /api/   → 127.0.0.1:3000 (Node) → Resend → inbox
```

## Repository layout

```
assets/        original brand source (never served)
public/        favicons, og image, robots.txt, manifest
src/
  components/  Astro components (Section, Header, ContactForm, …)
  layouts/     BaseLayout (single HTML shell)
  pages/       index, about, contact, apps/*, 404
  styles/      global.css — the entire design system (Tailwind v4 @theme)
  data/        site.ts + apps.ts — identity, services, nav and app content
server/
  src/         Express app, validation, Resend provider, config
  test/        node:test suite (23 tests)
nginx/         production Nginx config
systemd/       codedna-api.service
scripts/       brand-assets · dev · provision-ec2 · deploy
```

## Local development

Requires Node 22+ (`.nvmrc`). 

```bash
nvm install && nvm use
npm install
cp server/.env.example server/.env   # add RESEND_API_KEY + emails
npm run dev:all                      # Astro on :4321, API on :3000, /api proxied
```

Checks:

```bash
npm run check        # astro check (types + diagnostics)
npm run typecheck    # + server tsc
npm test             # server node:test suite
npm run audit:prod   # prod-deps only
```

## Design system

Strictly monochrome — black (`#0A0A0A`) on paper (`#FFFFFF`) with a single muted grey
(`#5F5F5F`) for secondary text and hairline rules. No accent colour, no gradients, no
glitter. Typography is Inter Variable (self-hosted, `wght` subset) with a system mono
stack reserved for micro-labels (`01 · CODE/DNA`). Section rhythm and the fluid type
scale live in `src/styles/global.css` — change it once and the whole site follows.

The site works with JavaScript disabled: the contact form degrades to a native POST
that the API answers with a 303 redirect.

## Contact API

`POST /api/contact` — JSON (enhanced) or urlencoded (no-JS). Behaviour:

- validation + sanitisation (trim, control-char strip, length caps, email shape)
- honeypot field; silent success to bots
- rate limit 5 / 15 min / IP (app) + 10 r/m (Nginx), body limit 16 KB
- CORS allowlist (no wildcard), generic error envelope, no PII logged
- email via Resend REST (no SDK dependency); provider is an injectable interface

Environment (`server/.env` locally, `/etc/codedna/api.env` on the server):

```
RESEND_API_KEY        # resend.com/api-keys
CONTACT_TO_EMAIL      # delivery inbox
CONTACT_FROM_EMAIL    # sender — must be a verified Resend domain
ALLOWED_ORIGINS       # comma-separated browser origins
RATE_LIMIT_WINDOW_MS  # default 900000
RATE_LIMIT_MAX        # default 5
TRUST_PROXY           # 1 behind Nginx (the reverse proxy)
```

## Deployment

One Ubuntu 24.04 EC2 (us-east-1). Security group: `80`/`443` from anywhere; `22`
restricted to the GitHub Actions runner IP ranges (from https://api.github.com/meta).
Node binds to loopback — it is never publicly reachable. TLS is Let's Encrypt
(certbot, standalone on :80, renewed on a twice-daily systemd timer).

Deployments run through the GitHub Actions workflow `.github/workflows/deploy.yml`
(build + test on the runner, then atomic release to the box) — no local tooling.

### One-time setup

1. **Spin up the EC2 instance** (Ubuntu 24.04, key pair `kyc`), open the security
   group as above, and point DNS at it:
   ```
   A  c0dedna.com  → <instance IP>
   A  www.c0dedna.com → <instance IP>
   ```
2. **Push the repo** (fresh credential, not the old token):
   ```bash
   cd <project>
   gh auth login                       # new PAT or SSH key — rotate the leaked one
   git init -b main && git add -A && git commit -m "Initial build — CI deploy ready"
   git remote add origin https://github.com/DarynOngera/codedna.git
   git push -u origin main
   ```
3. **Store secrets** in the GitHub repo (Settings → Secrets and variables → Actions):
   ```
   gh secret set SSH_HOST -R DarynOngera/codedna            # instance public IP
   gh secret set SSH_USER -R DarynOngera/codedna            # ubuntu
   gh secret set SSH_KEY -R DarynOngera/codedna             # contents of kyc.pem (or your key)
   gh secret set DOMAIN -R DarynOngera/codedna              # c0dedna.com
   gh secret set RESEND_API_KEY -R DarynOngera/codedna      # resend.com/api-keys
   gh secret set CONTACT_TO_EMAIL -R DarynOngera/codedna    # delivery inbox
   gh secret set CONTACT_FROM_EMAIL -R DarynOngera/codedna  # must be a verified Resend domain
   ```
   `CONTACT_FROM_EMAIL` must be a sending domain **verified in Resend** — add the
   required DNS records in Resend and the registrar before the form will send.

4. **Trigger a deploy**:
   ```bash
   gh workflow run deploy -R DarynOngera/codedna
   ```

The workflow provisions idempotently (nginx, Node 22, `codedna` user, systemd units,
certbot issue/renew), writes `/etc/codedna/api.env` from secrets, and atomically
flips a `current` symlink over timestamped releases.

### Manual fallback

`scripts/provision-ec2.sh` (root) then `scripts/deploy.sh ubuntu@<host>` still work
from a machine with the repo checked out; the workflow is the primary path.

## Security notes

- Only 80/443 exposed; HSTS, CSP, nosniff, and referrer policy set by Nginx on every
  response; HTTPS enforced with redirects.
- No secrets in the repo (`.env.example` only); real env is written by CI at deploy
  time. **Rotate any exposed tokens** — the previous `git remote` embedded a personal
  access token; push with a fresh credential.
- `npm audit` for prod deps runs in the CI build job.
- Renewal cert hooks stop/start Nginx briefly around `certbot renew` (standalone on :80).

## Extending

New pages: add `src/pages/<name>.astro` using `BaseLayout` + `Section` +
`SectionHeading`. Shared factual data goes in `src/data/site.ts`. If copy grows
substantially, introduce an Astro content collection then — not before.