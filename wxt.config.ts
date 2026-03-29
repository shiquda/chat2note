import { defineConfig } from 'wxt'
import { resolve } from 'node:path'

// Allows overriding the Chromium binary used for dev runs so Google OAuth
// works with a full Chrome build instead of the Playwright snapshot.
const chromeDevBinary = process.env.WXT_CHROME_BINARY

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  entrypointsDir: 'entrypoints',
  manifest: () => ({
    default_locale: 'en',
    permissions: [
      'downloads',
      'activeTab',
      'scripting',
      'contextMenus',
      'storage',
      'clipboardWrite',
      'tabs',
      'https://api.notion.com/*',
    ],
    commands: {
      'export-conversation': {
        suggested_key: {
          default: 'Ctrl+Shift+E',
          mac: 'Command+Shift+E',
        },
        description: 'Export conversation with default settings',
      },
    },
    host_permissions: [
      '*://chat.openai.com/*',
      '*://chatgpt.com/*',
      '*://claude.ai/*',
      '*://chat.deepseek.com/*',
      '*://gemini.google.com/*',
      '*://kimi.com/*',
      '*://www.kimi.com/*',
      '*://yuanbao.tencent.com/*',
      '*://doubao.com/*',
      '*://www.doubao.com/*',
      '*://grok.com/*',
      '*://www.grok.com/*',
      'https://api.notion.com/*',
    ],
    web_accessible_resources: [
      {
        resources: [
          '_locales/en/messages.json',
          '_locales/zh_CN/messages.json',
          '_locales/fr/messages.json',
          '_locales/de/messages.json',
          '_locales/es/messages.json',
          '_locales/pt/messages.json',
          '_locales/ja/messages.json',
          '_locales/ko/messages.json',
        ],
        matches: [
          '*://chat.openai.com/*',
          '*://chatgpt.com/*',
          '*://claude.ai/*',
          '*://chat.deepseek.com/*',
          '*://gemini.google.com/*',
          '*://kimi.com/*',
          '*://www.kimi.com/*',
          '*://yuanbao.tencent.com/*',
          '*://doubao.com/*',
          '*://www.doubao.com/*',
          '*://grok.com/*',
          '*://www.grok.com/*',
        ],
      },
    ],
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    applications: {
      gecko: {
        id: 'addon@chat2note.com',
        strict_min_version: '128.0',
      },
    },
  }),
  // 开发环境数据持久化配置
  webExt: {
    binaries: {
      ...(chromeDevBinary ? { chrome: chromeDevBinary } : {}),
      firefox: process.env.FIREFOX_BINARY || 'firefox',
    },
    firefoxProfile: process.env.FIREFOX_PROFILE || resolve('.wxt/firefox-profile'),
    // Chrome 数据持久化配置 - 恢复但避免 Chrome DevTools Protocol 问题
    chromiumProfile: process.env.CHROMIUM_PROFILE || resolve('.wxt/chrome-data'),
    keepProfileChanges: true,
    // Chrome 启动参数 - 绕过 Cloudflare 和 Google OAuth 检测
    chromiumArgs: [
      '--disable-blink-features=AutomationControlled', // 隐藏自动化标志
      '--disable-features=PrivacySandboxSettings4',
      '--no-first-run',
      '--disable-infobars',
      '--excludeSwitches=enable-automation', // 移除自动化标识
      '--disable-dev-shm-usage', // 避免共享内存问题
      '--disable-gpu', // 禁用GPU加速
    ],
    // Firefox 数据持久化配置 (如果需要独立的开发环境配置文件)
    // firefoxProfile: resolve(".wxt/firefox-profile"),
  },
})
