---
title: Quick Start
description: Get started with Chat2Note in minutes.
---

# Quick Start Guide

This guide will help you export your first AI chat conversation using Chat2Note.

## Step 1: Open a Supported Chat Platform

Chat2Note works with:

**Primary platforms**

- [ChatGPT](https://chat.openai.com) or [chatgpt.com](https://chatgpt.com)
- [Claude](https://claude.ai)
- [DeepSeek](https://chat.deepseek.com)
- [Gemini](https://gemini.google.com)

**Additional supported platforms**

- [Kimi](https://kimi.com)
- [Yuanbao](https://yuanbao.tencent.com)
- [Doubao](https://doubao.com)
- [Grok](https://grok.com)

Navigate to any of these platforms in your browser.

## Step 2: Start or Open a Conversation

Either start a new conversation or open an existing one that you want to export.

## Step 3: Click the Export Button

You'll see a **floating export button** appear on the page (usually in the bottom right corner or near the chat interface).

Click this button to open the export interface.

## Step 4: Choose Your Export Options

### Select Export Format

- **Markdown** – Preserves formatting, great for documentation and note apps
- **JSON** – Structured data, good for programmatic use
- **TXT** – Plain text, simple and compatible

### Select Export Target

- **Local File** – Downloads to your computer
- **Notion** – Exports to a Notion database (requires API token & database ID)
- **Obsidian** – Saves to your Obsidian vault via the URI scheme
- **SiYuan** – Sends Markdown to your local SiYuan notebook (requires API URL/token)
- **Joplin** – Creates notes through the Web Clipper service (requires API token)
- **Clipboard** – Copies formatted content for pasting elsewhere

### Choose Message Scope (Optional, Pro)

- **All messages** – Export the entire conversation
- **Selected messages** – Choose specific messages _(Pro feature)_
- **User messages only** – Export only your prompts _(Pro feature)_
- **Assistant messages only** – Export only AI responses _(Pro feature)_

### Include Metadata (Optional, Pro)

- Toggle **Include metadata** to add timestamps, source URLs, platform labels, and export time
- Configure **Notion property mappings** or **Obsidian YAML frontmatter** in settings before exporting

## Step 5: Export

Click the **Export** button. Depending on your target:

- **Local File**: The file will download automatically
- **Notion**: The page will be created in your database
- **Obsidian**: The file will open in Obsidian
- **SiYuan**: A Markdown document will appear in the configured notebook/folder
- **Joplin**: A note will be added to your default notebook (tags applied if configured)
- **Clipboard**: Content is ready to paste

## Example: Export to Markdown File

1. Open ChatGPT and start a conversation
2. Click the Chat2Note export button
3. Select **Markdown** format
4. Select **Local File** target
5. Click **Export**
6. The conversation downloads as a `.md` file

## Next Steps

- **Configure Notion integration**: [Notion Setup Guide](/docs/integrations/note-taking/notion/)
- **Configure Obsidian integration**: [Obsidian Setup Guide](/docs/integrations/note-taking/obsidian/)
- **Configure SiYuan integration**: [SiYuan Setup Guide](/docs/integrations/note-taking/siyuan/)
- **Configure Joplin integration**: [Joplin Setup Guide](/docs/integrations/note-taking/joplin/)
- **Backup your preferences**: Use **Advanced → Export Config** in the options page

## Tips

- Use **Markdown** format for maximum compatibility with note-taking apps
- Set up **Notion**, **Obsidian**, **SiYuan**, or **Joplin** integration for seamless workflow
- Use **message selection** (Pro) to export only relevant parts of long conversations
- The **clipboard** option is great for quick copy-paste operations
