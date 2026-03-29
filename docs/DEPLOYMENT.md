# Cloudflare Pages Deployment

This document describes the formal deployment setup for the Chat2Note documentation site.

## Recommended Architecture

- **Source of truth:** GitHub repository `shiquda/chat2note`
- **Docs root:** `docs/`
- **Hosting platform:** Cloudflare Pages
- **Deployment mode:** Cloudflare Pages GitHub integration
- **Custom domain:** `chat2note.com`

Cloudflare Pages is the official deployment target for the docs site. GitHub Pages is no longer the primary docs hosting path.

## Why Cloudflare Pages

- Better global edge delivery for a static docs site
- Built-in preview deployments for branch pushes and pull requests
- Native custom domain and TLS management in the Cloudflare dashboard
- No extra GitHub Actions workflow required for documentation deployment

## Cloudflare Pages Project Settings

Create a Pages project from the GitHub repository with these settings:

- **Project type:** Pages
- **Production branch:** `main`
- **Framework preset:** `Astro`
- **Root directory:** `docs`
- **Build command:** `pnpm build`
- **Build output directory:** `dist`
- **Node.js version:** `22`

If Cloudflare asks for an install command, use the default package-manager install or `pnpm install --frozen-lockfile`.

## Deployment Flow

1. Open Cloudflare dashboard
2. Go to **Workers & Pages**
3. Choose **Create application** -> **Pages** -> **Import an existing Git repository**
4. Connect GitHub and select `shiquda/chat2note`
5. Configure the project with the settings above
6. Save and deploy

After setup, Cloudflare Pages will automatically:

- Deploy `main` as production
- Build preview deployments for branches and pull requests
- Keep the docs site independent from the extension release workflow

## Domain Setup

Add the custom domain from the Cloudflare Pages dashboard:

- `chat2note.com`
- optionally `www.chat2note.com`

If the DNS zone is already hosted in Cloudflare, prefer letting Cloudflare Pages manage the DNS records automatically from the dashboard.

If you need to create records manually, point them to the Pages project domain shown in Cloudflare, typically `<project>.pages.dev`.

## Repository Files Related to Deployment

- `docs/astro.config.mjs`: canonical site URL
- `docs/package.json`: docs build commands
- `docs/wrangler.toml`: local Pages metadata and build output directory
- `docs/README.md`: contributor-facing docs instructions

## Local Validation

Run this before changing deployment settings:

```bash
cd docs
pnpm build:check
```

## Migration Notes from GitHub Pages

When cutting over from GitHub Pages to Cloudflare Pages:

1. Ensure the Cloudflare Pages project has deployed successfully
2. Switch the custom domain to Cloudflare Pages
3. Confirm `chat2note.com` serves the Cloudflare Pages site with valid TLS
4. Only then disable or remove any remaining GitHub Pages site settings

## Troubleshooting

### Build succeeds locally but fails in Cloudflare

- Confirm the Pages root directory is `docs`
- Confirm the build output directory is `dist`
- Confirm Cloudflare is using Node.js 22

### Client-side behavior breaks after deployment

- Check whether Cloudflare Auto Minify changes page output
- If hydration issues appear, disable Auto Minify for HTML/JS and redeploy

### Custom domain certificate is invalid

- Make sure the custom domain is attached in the Cloudflare Pages dashboard
- Make sure DNS points at the Pages project, not GitHub Pages
- Wait for TLS provisioning to finish before testing HTTPS aggressively
