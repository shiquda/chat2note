# Chat2Note

Chat2Note is a local-first browser extension for exporting AI chat conversations into Markdown, JSON, TXT, and note tools.

This repository is the initial public OSS release of the extension core. It keeps the chat parsers, export pipeline, and user-managed integrations, while removing commercial feature gating and private backend dependencies.

## What it can do

- Export conversations from ChatGPT, Claude, DeepSeek, Gemini, Kimi, Doubao, Yuanbao, and Grok
- Export to local files, clipboard, Notion, Obsidian, SiYuan, and Joplin
- Support Markdown, JSON, and TXT output
- Select messages, include metadata, and customize Markdown templates
- Store user-supplied Notion and Joplin credentials locally in browser storage

## OSS release scope

- Included: extension core, parsers, export logic, settings UI, localization files, tests, and build scripts
- Removed: membership gating, upgrade prompts, commercial backend configuration, marketing pages, and private deployment details

## Install for testing

### Firefox

- Built package: `.output/chat2note-0.1.0-firefox.zip`
- Unpacked build directory: `.output/firefox-mv2`

### Chrome / Chromium

- Build the extension with `pnpm build`
- Load the generated `.output/chrome-mv3` directory as an unpacked extension

## Development

```bash
pnpm install
pnpm compile
pnpm test
pnpm build
pnpm build:firefox
```

## Notes

- `wxt.config.ts` targets both Chrome and Firefox builds.
- Settings import and export still support excluding sensitive tokens.
- This public repository is focused on the extension itself, not the previously private commercial stack.

## License

This project is licensed under the GNU Affero General Public License v3.0 or later. See `LICENSE`.
