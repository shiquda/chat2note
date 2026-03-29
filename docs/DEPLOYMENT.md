# Cloudflare Pages Deployment Configuration

This file documents the recommended Cloudflare Pages configuration for the Chat2Note documentation site.

## Build Configuration

When setting up your Cloudflare Pages project, use these settings:

### Framework Preset
- **Framework**: Astro

### Build Settings
- **Build command**: `pnpm build`
- **Build output directory**: `dist`
- **Root directory**: `docs`

### Environment Variables
No environment variables are required for basic deployment.

## Branch Configuration

### Production Branch
- **Branch**: `master` (or `main`)
- **Deployment**: Automatic on push
- **URL**: Your custom domain (e.g., `chat2note.com`)

### Preview Deployments
- **Branches**: All other branches
- **Deployment**: Automatic on push
- **URL**: `<branch-name>.chat2note.pages.dev`

## Custom Domain Setup

### Add Custom Domain
1. In Cloudflare Pages dashboard, go to your project
2. Navigate to **Custom domains**
3. Click **Set up a custom domain**
4. Enter your domain: `chat2note.com`
5. Follow DNS configuration instructions

### DNS Configuration
Add the following DNS records in your Cloudflare dashboard:

```
Type: CNAME
Name: www
Content: chat2note.pages.dev
Proxy: Enabled (orange cloud)

Type: CNAME
Name: @
Content: chat2note.pages.dev
Proxy: Enabled (orange cloud)
```

## Advanced Configuration

### Build Watch Paths (Optional)
```
docs/**
```

This ensures builds only trigger when files in the `docs/` directory change.

### Node.js Version
- **Version**: 18 or 20 (automatically detected from package.json engines field if specified)

## Deployment Steps

1. **Connect Repository**
   - Go to Cloudflare Pages dashboard
   - Click **Create a project**
   - Connect your GitHub account
   - Select the `chat2note` repository

2. **Configure Build**
   - Set framework preset to **Astro**
   - Set root directory to `docs`
   - Set build command to `pnpm build`
   - Set build output directory to `dist`

3. **Deploy**
   - Click **Save and Deploy**
   - Cloudflare will build and deploy your site

4. **Configure Domain** (Optional)
   - Add custom domain in project settings
   - Configure DNS as described above

## Automatic Deployments

Once configured, Cloudflare Pages will automatically:
- Build and deploy on every push to production branch
- Create preview deployments for pull requests
- Show build status in GitHub

## Build Cache

Cloudflare Pages automatically caches:
- `node_modules/` (based on package.json hash)
- Build artifacts

## Troubleshooting

### Build Failures

If builds fail, check:
1. Build logs in Cloudflare dashboard
2. Ensure `docs/package.json` has correct dependencies
3. Verify root directory is set to `docs`

### Preview Not Working

For preview deployments:
1. Ensure preview deployments are enabled
2. Check branch protection rules
3. Verify GitHub app permissions

## Performance

After deployment, your site will benefit from:
- **Global CDN**: Cloudflare's edge network
- **HTTP/3**: Latest protocol support
- **Brotli compression**: Automatic compression
- **Smart routing**: Optimal path to origin

## Monitoring

Monitor your deployment:
- **Analytics**: Cloudflare Pages dashboard
- **Web Analytics**: Enable in project settings
- **Build logs**: Available for each deployment

## Local Testing

Test production build locally before deploying:

```bash
cd docs
pnpm build
pnpm preview
```

This mimics the Cloudflare Pages build process.
