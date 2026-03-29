import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import tailwind from '@astrojs/tailwind'
import icon from 'astro-icon'

// https://astro.build/config
export default defineConfig({
  site: 'https://chat2note.com',
  integrations: [
    icon(),
    tailwind({
      // Disable base styles to avoid conflicts with Starlight
      applyBaseStyles: false,
    }),
    starlight({
      title: {
        'en': 'Chat2Note Docs',
        'zh-CN': 'Chat2Note 文档'
      },
      description: 'Privacy-first browser extension for exporting AI chat conversations',
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: false,
      },
        defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        'zh-cn': {
          label: '简体中文',
          lang: 'zh-CN',
        },
      },
      sidebar: [
        {
          label: 'Getting Started',
          translations: {
            'zh-CN': '快速开始',
          },
          autogenerate: { directory: 'docs/getting-started' },
        },
        {
          label: 'Integrations',
          translations: {
            'zh-CN': '集成',
          },
          items: [
            {
              label: 'AI Platforms',
              translations: {
                'zh-CN': 'AI平台',
              },
              autogenerate: { directory: 'docs/integrations/ai-platforms' },
            },
            {
              label: 'Note-Taking Platforms',
              translations: {
                'zh-CN': '笔记平台',
              },
              autogenerate: { directory: 'docs/integrations/note-taking' },
            },
          ],
        },
      ],
      customCss: [
        './src/styles/custom.css',
      ],
    }),
  ],
  vite: {
    optimizeDeps: {
      exclude: ['sharp']
    }
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
})