---
title: Joplin Integration
description: Export AI conversations from Chat2Note into Joplin using the Web Clipper API.
---

# Joplin Integration

Use Chat2Note with Joplin to keep an offline, Markdown-based archive of your AI conversations.

## Prerequisites

- Joplin desktop app installed (2.14 or later recommended)
- The Joplin Web Clipper service enabled under **Tools → Web Clipper options**
- Chat2Note browser extension installed in Chromium- or Firefox-based browsers

## Step 1: Enable and Authorize the Web Clipper

1. In Joplin, open **Tools → Web Clipper options**.
2. Check **Enable Web Clipper service** and confirm the service URL (default: `http://127.0.0.1:41184`).
3. Click **Generate Web Clipper token** or copy the existing token.
4. Leave Joplin running—Chat2Note connects to the Web Clipper over HTTP when you export.

> **Tip:** Joplin can also approve programmatic access. Chat2Note supports both manual token entry and the authorization flow exposed by Joplin.

## Step 2: Gather Optional Metadata

- Determine the **default notebook** (right-click → Copy Notebook ID) where exported notes should land.
- Prepare a comma-separated list of **default tags** to classify your AI conversations.
- Decide whether exported notes should include metadata (requires a Pro membership in Chat2Note).

## Step 3: Configure Chat2Note

1. Open the Chat2Note **Options** page.
2. Go to **Integrations → Joplin**.
3. Enable the **Joplin integration** toggle.
4. Enter the following details:
   - **API URL** – typically `http://127.0.0.1:41184`
   - **API Token** – paste the Web Clipper token (encrypted before storage)
   - **Default Notebook ID** – optional notebook destination
   - **Default Tags** – optional list, one tag per line
   - **Include metadata** – toggle whether platform info and timestamps should be appended _(Pro)_
5. Click **Test connection**. Chat2Note will call the Web Clipper `ping` endpoint and confirm the service is reachable.

## Step 4: Export a Conversation

1. Open a supported AI chat platform and capture the conversation with Chat2Note.
2. Choose **Markdown** as the export format (Joplin consumes Markdown content).
3. Select **Joplin** as the target.
4. (Pro) Enable **Include metadata** to append export timestamps, source URLs, and model information.
5. Click **Export**. Chat2Note will:
   - Convert the conversation to Markdown (including LaTeX and code blocks)
   - Create a note through the `notes` endpoint
   - Apply default tags (creating them when necessary)
   - Store the note in the specified notebook

## Managing API Tokens Securely

- Chat2Note encrypts the Web Clipper token using the browser's storage API—only the extension can decrypt it.
- Clearing the token from the options page removes it from storage immediately.
- If you rotate the token in Joplin, update it in Chat2Note and re-test the connection.

## Troubleshooting

| Symptom                                          | How to fix                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Connection test fails**                        | Confirm the Web Clipper service is enabled and the API URL matches the port listed in Joplin.                  |
| **"Joplin integration is not configured" error** | Double-check the integration toggle and ensure a valid token is stored.                                        |
| Notes created without tags                       | Make sure default tags are listed one per line and spelled consistently.                                       |
| Metadata missing                                 | Metadata export and custom templates require an active Pro membership.                                         |
| Authorization request loops                      | If using programmatic authorization, approve the prompt inside Joplin and copy the final token into Chat2Note. |

## Best Practices

- Create a dedicated notebook for AI exports to keep your main notes tidy.
- Combine Chat2Note's file name template (Pro) with Joplin's search filters to organize long-term research.
- Use Joplin's synchronization (Dropbox, Nextcloud, etc.) to sync exported conversations across devices.
- Periodically export your Chat2Note configuration (Options → Advanced) so you can restore Joplin settings quickly after reinstalling.

With the Joplin integration enabled, every AI conversation can live alongside your offline notes, tags, and notebooks.
