<<<<<<< HEAD
# FinTran × Tiger — Finance AI Platform

**Tiger Analytics** · A consolidated three-layer finance AI platform for FinTran Group

---

## What is this

A single platform that tells the complete FinTran × Tiger finance-AI story across three connected layers:

1. **Vision** (`Evolution`) — the scrollytelling narrative: two years, three acts; the cost→value story; agents as the interface; trust as the moat.
2. **Command Center** — the executive overview: login, persona selection, finance-function towers (Treasury, Controllership, FSSC, FP&A, Tax…), KPI drill-downs, the Tiger engagement tracker, and a voice assistant.
3. **CloseIQ** — the deep execution cockpit for the month-end close: Sources ingestion, CFO view, Pack/Variance, TB Scrutiny, Intercompany Recon, JE accruals, Cash Forecast, and the Sage AI assistant.

The flow is **Vision → Command Center → CloseIQ**. A persistent app-switcher bar (top of screen, or ⌘1/⌘2/⌘3) lets you jump between layers. From the Command Center's Controllership function, an embedded launcher opens CloseIQ seamlessly — one integrated app.

The platform is built from source into four static HTML files (a shell + three apps) that run anywhere.

---

## Architecture

```
index.html              ← the shell (app-switcher + iframe host)
├── app-evolution.html  ← Vision narrative
├── app-command.html    ← Command Center (with CloseIQ launcher injected)
└── app-closeiq.html    ← CloseIQ close cockpit (self-contained, PptxGenJS inlined)
```

The shell hosts each app in an iframe so their CSS/JS never collide. Navigation between apps is handled by `postMessage` — Evolution's CTA opens the Command Center; the Command Center's Controllership page opens CloseIQ.

---

## Repository structure

```
├── src/
│   ├── apps/
│   │   ├── shell.html           ← the platform shell (app-switcher + iframe host)
│   │   ├── evolution.html       ← Vision narrative (source)
│   │   └── command-center.html  ← Command Center (source)
│   ├── css/app.css              ← CloseIQ styles (Tiger brand light theme)
│   ├── js/app.js                ← CloseIQ application logic
│   └── data/closeiq_data.json   ← synthetic FinTran close data (280 TB rows, 8 scrutiny items…)
├── scripts/
│   ├── build_platform.py        ← builds the full platform (4 files) — THE MAIN BUILD
│   ├── build.py                 ← builds CloseIQ standalone only
│   └── pptxgen.bundle.js        ← PptxGenJS 4.0.1 (self-contained, no CDN)
├── public/                      ← GENERATED — do not edit directly
│   ├── index.html               ← shell
│   ├── app-evolution.html
│   ├── app-command.html
│   └── app-closeiq.html
├── deploy/
│   ├── nginx.conf               ← Nginx config for your domain (with SSL)
│   ├── nginx.docker.conf        ← Nginx config for Docker
│   ├── Dockerfile               ← multi-stage Docker build
│   └── docker-compose.yml       ← one-command VPS deployment
├── .github/workflows/
│   └── deploy.yml               ← GitHub Actions: build + deploy on push to main
├── .gitignore
├── package.json
└── README.md
```

---

## Quick start (local)

**Requirements:** Python 3.9+

```bash
git clone https://github.com/<your-org>/closeiq.git
cd closeiq

# Build
python3 scripts/build_platform.py

# Serve locally on http://localhost:3000
python3 -m http.server 3000 --directory public

# Or using npm scripts:
npm run dev
```

Open **http://localhost:3000** in Chrome.

---

## Customising the data

All close data lives in **`src/data/closeiq_data.json`**. The structure:

| Key | Contents |
|-----|----------|
| `entities` | 10 FinTran entities (code, name, vertical) |
| `tb` | 280 trial-balance rows (entity × GL × current/prior/ly/budget) |
| `scrutiny` | 8 flagged aged balances with root-cause and recommendation |
| `ic` | 10 intercompany pairs with match status |
| `je` | 8 PO accrual lines |
| `sources` | 4 source-system connector definitions |
| `stats` | Pre-computed headline figures |

Edit this file to swap in real or different synthetic data, then run `python3 scripts/build_platform.py`.

---

## Enabling live AI reasoning (Sage)

Sage works in two modes:

**On-device reasoning (default, no setup needed)**
The app parses any finance question, resolves entities/metrics/intents, and computes the answer from `closeiq_data.json`. Works offline, covers all close questions.

**Live LLM reasoning (claude-sonnet-4-6)**

*Option A — Claude.ai artifact (easiest)*
Open `public/index.html` as an artifact inside a Claude.ai conversation. Live reasoning activates automatically.

*Option B — Anthropic API key*
Get a key from [console.anthropic.com](https://console.anthropic.com), click the **"● Sonnet 4.6"** pill inside Sage, and paste it. The key stays in browser memory only — it is never stored or sent anywhere except the Anthropic API.

---

## Deployment

### Option 1 — GitHub Pages (free, fastest)

1. Push to GitHub.
2. In your repo: **Settings → Pages → Source → GitHub Actions**.
3. The `deploy.yml` workflow builds and publishes automatically on every push to `main`.
4. Your app is live at `https://<org>.github.io/closeiq`.

**Custom domain on GitHub Pages:**
- Add a `CNAME` file containing your domain (e.g. `closeiq.fintran.com`) to the `public/` directory.
- In your DNS, add a CNAME record: `closeiq.fintran.com → <org>.github.io`.
- Enable "Enforce HTTPS" in GitHub Pages settings.

---

### Option 2 — VPS / Dedicated Server (Nginx)

**Step 1 — Build and copy files**
```bash
python3 scripts/build_platform.py
rsync -avz public/ user@yourserver:/var/www/closeiq/
```

**Step 2 — Install Nginx config**
```bash
# Edit deploy/nginx.conf — replace closeiq.yourdomain.com with your domain
scp deploy/nginx.conf user@yourserver:/etc/nginx/sites-available/closeiq
ssh user@yourserver "sudo ln -s /etc/nginx/sites-available/closeiq /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx"
```

**Step 3 — SSL with Certbot**
```bash
ssh user@yourserver
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d closeiq.yourdomain.com
```

**Step 4 — Automate with GitHub Actions**
Uncomment the `deploy-vps` job in `.github/workflows/deploy.yml` and add these secrets to your GitHub repo:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your server IP or hostname |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Private SSH key (paste the full key) |
| `VPS_DEPLOY_PATH` | `/var/www/closeiq` |

Now every push to `main` builds and deploys automatically.

---

### Option 3 — Docker (any cloud: AWS, GCP, Azure, DigitalOcean)

```bash
# Build and run locally
docker compose -f deploy/docker-compose.yml up --build -d

# Or on a VPS
git clone https://github.com/<your-org>/closeiq.git
cd closeiq
docker compose -f deploy/docker-compose.yml up --build -d
```

**DigitalOcean App Platform (one-click):**
- Connect your GitHub repo.
- Set build command: `python3 scripts/build_platform.py`
- Set output directory: `public`
- Done — it builds and deploys on every push.

**AWS S3 + CloudFront:**
```bash
python3 scripts/build_platform.py
aws s3 sync public/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Updating the app

The source files to edit:

| File | What to change |
|------|----------------|
| `src/data/closeiq_data.json` | Entity data, TB rows, scrutiny items, IC pairs |
| `src/js/app.js` | Logic, views, Sage answers, agent sequences |
| `src/css/app.css` | Styles, theme tokens |
| `scripts/build.py` | Build assembly (rarely needed) |

After any edit:
```bash
python3 scripts/build_platform.py  # regenerates public/index.html
git add -A && git commit -m "update" && git push  # triggers CI/CD
```

---

## Export pack (PPT)

The app generates a real downloadable PPTX using PptxGenJS 4.0.1 (bundled inline — no CDN needed). Navigate to **Pack & Variance**, select the audience (CFO/FP&A/Entity Controller), and click **Export pack (PPT)**. The file downloads as `CloseIQ_FinTran_[Audience]_May2026.pptx`.

---

## Email pack

Click **Email pack** on the Pack & Variance view:
1. Enter the recipient email address.
2. The PPTX downloads to your device.
3. Your default email client opens with subject and body pre-filled.
4. Attach the downloaded file and send.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| App | Vanilla JS (no framework) + HTML5 + CSS3 |
| Charts | SVG generated inline (no charting library) |
| PPTX export | PptxGenJS 4.0.1 (bundled) |
| AI reasoning | claude-sonnet-4-6 via Anthropic API |
| Voice | Web Speech API (browser-native) |
| Build | Python 3 (stdlib only, no dependencies) |
| CI/CD | GitHub Actions |
| Serving | Nginx / GitHub Pages / Docker |

---

## Sample upload files

For the live data ingestion demo, four synthetic extract files matching the FinTran source systems are in `/sample_extracts/` (not committed to git — download separately from the CloseIQ demo package):

- `sample_OracleFusion_OTBI_TrialBalance_MAY2026.xlsx`
- `sample_Salesforce_AR_Aging_MAY2026.csv`
- `sample_DLD_Deposits_Refunds_MAY2026.csv`
- `sample_EPM_Budget_MAY2026.xlsx`

---

## License

**Proprietary — Tiger Analytics Internal**
Not for distribution outside Tiger Analytics or authorised client engagements.

---

*CloseIQ v2.4.1 · Tiger Analytics · Built with Claude Sonnet 4.6*
=======
# CloseIQ
>>>>>>> 1ecfe1249755425ded3eb6dfbc79852e4cabd41c
