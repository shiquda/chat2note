---
title: Note-Taking Platform Integrations
description: Export your AI conversations to popular note-taking platforms.
---

# Note-Taking Platform Integrations

Chat2Note allows you to export AI conversations directly to your favorite note-taking platforms, creating a seamless workflow for knowledge management.

## Supported Platforms

### Notion

**Description:** Export conversations as structured pages in your Notion databases.

**Features:**

- ✅ Create pages in existing databases with one click
- ✅ Automatic property mapping for URL, export time, platform, and message count
- ✅ Markdown-to-block conversion powered by the Martian library
- ✅ Optional metadata export (Pro) with secure local token storage
- ✅ Connection testing directly from the options page

**Setup Required:**

- Notion account
- Database ID (from the database URL)
- Internal integration token (`secret_...`)

**Learn More:** [Notion Setup Guide](notion)

### Obsidian

**Description:** Save conversations as Markdown files in your Obsidian vault via the `obsidian://` URI scheme.

**Features:**

- ✅ Configurable vault name, folder path, and open mode
- ✅ Strict Markdown mode to guarantee compatibility
- ✅ Optional YAML frontmatter toggle _(Pro)_
- ✅ Automatic filename sanitization and collision handling
- ✅ Preview of the final vault path before exporting

**Setup Required:**

- Obsidian installed locally
- `obsidian://` URI handler enabled in Obsidian settings

**Learn More:** [Obsidian Setup Guide](obsidian)

### SiYuan

**Description:** Publish Markdown notes to your local SiYuan notebook through its HTTP API.

**Features:**

- ✅ Works with self-hosted or desktop SiYuan instances
- ✅ Configurable API URL, notebook ID, and target folder
- ✅ Optional block attribute syncing for structured workflows
- ✅ Automatic Markdown generation with safe character normalization
- ✅ Connection testing to verify API credentials

**Setup Required:**

- SiYuan running with the API service enabled
- API token with write permissions
- Notebook ID and optional folder path

**Learn More:** [SiYuan Setup Guide](siyuan)

### Joplin

**Description:** Send notes to Joplin via the Web Clipper API for offline-first knowledge bases.

**Features:**

- ✅ Supports both manual API tokens and programmatic authorization
- ✅ Choose default notebook and assign tags automatically
- ✅ Optional metadata export _(Pro)_
- ✅ Markdown conversion with math and code block preservation
- ✅ Connection testing to validate the Web Clipper service

**Setup Required:**

- Joplin desktop app with Web Clipper service enabled
- API token (or ability to approve programmatic access)
- Optional default notebook ID and tags

**Learn More:** [Joplin Setup Guide](joplin)

### Local Files

**Description:** Download conversations as files to your computer

**Features:**

- ✅ Multiple formats: Markdown, JSON, TXT
- ✅ Automatic file downloads
- ✅ Chinese filename support
- ✅ Organized by date and conversation
- ✅ No setup required
- ⚡ Optional file name template overrides _(Pro)_

**Supported Formats:**

- **Markdown** - Full formatting preserved
- **JSON** - Structured data format
- **TXT** - Plain text export

### Clipboard

**Description:** Copy formatted conversations to your clipboard

**Features:**

- ✅ Instant copy-paste functionality
- ✅ Preserves formatting
- ✅ Works with any application
- ✅ No setup required
- ✅ Perfect for quick sharing

**Use Cases:**

- Paste into email clients
- Share in messaging apps
- Import into other tools
- Quick content sharing

## Comparison

| Platform    | Setup Required            | Formats Supported   | Offline Access | Collaboration   |
| ----------- | ------------------------- | ------------------- | -------------- | --------------- |
| Notion      | API token + database ID   | Markdown, JSON      | No             | ✅              |
| Obsidian    | Enable `obsidian://` URIs | Markdown            | ✅             | ✅ (via sync)   |
| SiYuan      | API URL, token, notebook  | Markdown            | ✅             | ✅ (local sync) |
| Joplin      | Web Clipper token         | Markdown            | ✅             | Manual          |
| Local Files | None                      | Markdown, JSON, TXT | ✅             | Manual          |
| Clipboard   | None                      | Markdown, JSON, TXT | ✅             | Manual          |

## Choosing the Right Platform

### For Personal Knowledge Management

- **Obsidian** – Best for local, offline-first workflows
- **SiYuan** – Structured block-based notes with API-driven updates
- **Joplin** – Offline notebooks with tag organization
- **Local Files** – Simple and universally compatible

### For Team Collaboration

- **Notion** – Excellent for sharing and collaboration
- **Clipboard** – Quick sharing with team members

### For Quick Access

- **Clipboard** – Instant copy-paste functionality
- **Local Files** – Download and organize as needed

### For Advanced Workflows

- **Notion** – Database integration and automation
- **Obsidian** – URI-based linking and graph views
- **SiYuan** – API-driven automation with block attributes
- **Joplin** – Notebook/tag automation through the Web Clipper API

## Getting Started

1. **Choose your target platform** based on your workflow needs
2. **Follow the setup guide** for your chosen platform
3. **Export your first conversation** to test the integration
4. **Organize your exported content** for easy retrieval

## Security & Privacy

- All processing happens locally in your browser
- API tokens are encrypted when stored
- No data is sent to external servers
- Your conversations remain private and secure
