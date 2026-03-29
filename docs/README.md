# Chat2Note Documentation & Website

This directory contains the official website and documentation for Chat2Note, built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or 20+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev

# Open http://localhost:4321 in your browser
```

### Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 📁 Project Structure

```
docs/
├── public/              # Static assets (images, fonts, etc.)
├── src/
│   ├── content/
│   │   └── docs/       # Documentation content (Markdown/MDX)
│   ├── components/     # Reusable components
│   ├── layouts/        # Page layouts
│   ├── pages/          # Website pages (non-docs)
│   └── styles/         # Custom styles
├── astro.config.mjs    # Astro configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## 📝 Writing Documentation

### Adding a New Page

1. Create a new `.md` or `.mdx` file in `src/content/docs/`
2. Add frontmatter with title and description:

```markdown
---
title: Page Title
description: Page description for SEO
---

# Your content here
```

3. The page will automatically appear in the sidebar based on the directory structure

### Multi-language Support

To add translations:

1. Create a language-specific directory: `src/content/docs/zh-cn/`
2. Mirror the English file structure
3. Translate the content while keeping the same file names

### Using Components

You can use Starlight's built-in components:

```mdx
import { Card, CardGrid } from '@astrojs/starlight/components';

<CardGrid>
  <Card title="Feature 1" icon="star">
    Description here
  </Card>
</CardGrid>
```

## 🎨 Customization

### Custom Styles

Edit `src/styles/custom.css` to customize the appearance.

### Theme Colors

Modify color variables in `custom.css`:

```css
:root {
  --sl-color-accent: #0ea5e9;
  --sl-color-accent-high: #0284c7;
}
```

### Logo

Replace the logo in `astro.config.mjs`:

```js
logo: {
  src: './public/logo.svg',
}
```

## 🚢 Deployment

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build configuration:
   - **Build command:** `pnpm build`
   - **Build output directory:** `dist`
   - **Root directory:** `docs`

### Other Platforms

Chat2Note documentation can be deployed to:

- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

## 📚 Resources

- [Astro Documentation](https://docs.astro.build)
- [Starlight Documentation](https://starlight.astro.build)
- [Chat2Note Repository](https://github.com/Chat2Note)

## 🤝 Contributing

Contributions to improve documentation are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This documentation is part of the Chat2Note project and follows the same license.
