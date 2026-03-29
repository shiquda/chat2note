---
title: SiYuan Integration
description: Configure Chat2Note to send conversations directly to SiYuan notebooks via the HTTP API.
---

# SiYuan Integration

Connect Chat2Note to your SiYuan workspace to save AI conversations as Markdown documents inside your local knowledge base.

## Prerequisites

- SiYuan desktop or server edition running on your machine
- The SiYuan HTTP API enabled with a valid access token
- Chat2Note browser extension installed in Chromium- or Firefox-based browsers

## Step 1: Enable the SiYuan API

1. Open **SiYuan → Settings → Network**.
2. Enable the **API service** and note the API endpoint (default: `http://127.0.0.1:6806`).
3. Generate or copy the **API token** listed in the same panel.
4. Make sure SiYuan stays running while you export notes—Chat2Note communicates with it in real time.

## Step 2: Locate Your Notebook ID

1. In SiYuan, open the notebook that should store your AI notes.
2. Right-click the notebook name and choose **Copy Notebook ID** (or check the notebook properties panel).
3. Optionally decide on a folder path inside the notebook (e.g., `AI/Chat2Note`). The folder will be created automatically if it does not exist.

## Step 3: Configure Chat2Note

1. Open the Chat2Note **Options** page.
2. Navigate to **Integrations → SiYuan**.
3. Enable the **SiYuan integration** toggle.
4. Fill in the required fields:
   - **API URL** – usually `http://127.0.0.1:6806`
   - **API Token** – the token you copied from SiYuan (stored encrypted by Chat2Note)
   - **Notebook ID** – the target notebook UUID
   - **Folder Path** (optional) – subfolder for exports
5. (Optional) Enable **Set block attributes** if you want Chat2Note to attach metadata such as `custom-source-url` and `custom-platform` to each block.
6. Click **Test connection** to verify the credentials. Chat2Note will call `/api/notebook/openNotebook` and confirm the API response.

## Step 4: Export a Conversation

1. Open a supported AI chat (ChatGPT, Claude, DeepSeek, Gemini, etc.).
2. Click the Chat2Note floating export button.
3. Choose **Markdown** as the format (SiYuan only accepts Markdown).
4. Select **SiYuan** as the export target.
5. (Pro) Toggle **Include metadata** if you want timestamps, platform labels, and source URLs embedded in the note.
6. (Pro) Apply custom Markdown templates for full control over the exported structure.
7. Click **Export**. Chat2Note will create a Markdown document via `createDocWithMd` inside the configured notebook/folder.

## Resulting Note Structure

- Files are created with sanitized titles derived from the conversation name.
- Content is written as Markdown with LaTeX, code blocks, and lists preserved.
- Metadata is appended inside the document body; YAML frontmatter is intentionally disabled to keep SiYuan-compatible formatting.
- When block attributes are enabled, Chat2Note stores metadata on the root block, improving search and backlinks.

## Troubleshooting

| Symptom                                  | How to fix                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **"Connection failed"** when testing     | Confirm SiYuan is running, the API URL matches your environment, and the token is valid.                   |
| Notes appear outside the expected folder | Check the folder path spelling; Chat2Note trims leading/trailing slashes but the notebook must exist.      |
| Export succeeds but content is empty     | Make sure the API token has write permission and that `createDocWithMd` is enabled in your SiYuan version. |
| Metadata missing                         | Ensure you enabled metadata in the export dialog (Pro) and block attributes (optional) in settings.        |

## Best Practices

- Keep SiYuan updated—Chat2Note targets the official API schema and benefits from the latest bug fixes.
- Use dedicated folders (e.g., `Chat2Note/{Platform}`) to organize exports by AI provider.
- Combine SiYuan's backlinks with Chat2Note's metadata to cross-reference research sessions.
- Schedule periodic configuration exports (Options → Advanced) so you can restore the SiYuan settings quickly on new machines.

You're now ready to archive AI conversations directly into SiYuan with full control over metadata and structure.
