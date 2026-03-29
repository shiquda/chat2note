# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [0.1.0] - 2026-03-29

Initial public OSS release.

### Added

- Public AGPL-licensed OSS repository and release packaging
- Automated GitHub Actions release workflow for Chromium and Firefox builds on tag push
- GitHub Pages documentation site powered by Astro and Starlight
- Notion tags export support with configurable property mapping
- Public repository metadata including topics, homepage, and release artifacts

### Changed

- Removed commercial feature gating and private backend dependencies from the public snapshot
- Restored missing options UI sections including floating button position and metadata-related settings
- Updated public package and extension identity to use `chat2note.com`

### Fixed

- Fixed Notion `invalid_json` export failures caused by double JSON serialization
- Fixed Notion platform tag labeling so known platform ids resolve to human-readable names
- Fixed options page property mapping updates so new Notion `tags` mapping is preserved
- Fixed release CI checks after importing the docs site by isolating docs from the extension TypeScript compile scope

### Distribution

- GitHub Release: `https://github.com/shiquda/chat2note/releases/tag/v0.1.0`
- Assets:
  - `chat2note-0.1.0-chrome.zip`
  - `chat2note-0.1.0-firefox.zip`
