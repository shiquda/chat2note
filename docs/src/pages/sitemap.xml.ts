import type { APIRoute } from 'astro'

const GET: APIRoute = ({ site }) => {
  const pages = [
    {
      url: '/',
      lastmod: new Date(),
      changefreq: 'weekly',
      priority: 1.0,
    },
    {
      url: '/docs',
      lastmod: new Date(),
      changefreq: 'weekly',
      priority: 0.9,
    },
    {
      url: '/docs/getting-started/introduction',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.8,
    },
    {
      url: '/docs/getting-started/installation',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.8,
    },
    {
      url: '/docs/getting-started/supported-platforms',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.8,
    },
    {
      url: '/docs/integrations/ai-platforms/overview',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      url: '/docs/integrations/note-taking/overview',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      url: '/docs/integrations/note-taking/notion',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      url: '/docs/integrations/note-taking/obsidian',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      url: '/docs/integrations/note-taking/siyuan',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      url: '/docs/integrations/note-taking/joplin',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.7,
    },
    {
      url: '/pricing',
      lastmod: new Date(),
      changefreq: 'monthly',
      priority: 0.6,
    },
    {
      url: '/privacy',
      lastmod: new Date(),
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      url: '/terms',
      lastmod: new Date(),
      changefreq: 'yearly',
      priority: 0.3,
    },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${pages
        .map(
          page => `
        <url>
          <loc>${site?.href}${page.url}</loc>
          <lastmod>${page.lastmod.toISOString()}</lastmod>
          <changefreq>${page.changefreq}</changefreq>
          <priority>${page.priority}</priority>
        </url>
      `
        )
        .join('')}
    </urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

export { GET }
