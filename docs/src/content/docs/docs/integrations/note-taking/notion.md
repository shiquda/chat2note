---
title: Notion Integration
description: Learn how to connect Chat2Note to Notion databases for structured conversation archiving.
---

# Notion Integration

Export AI conversations directly into Notion databases using Chat2Note's built-in Notion client. Pages are created locally in your browser and delivered to Notion through the official API—no intermediate servers involved.

## Prerequisites

- A Notion account (free or paid)
- A database to store AI conversations
- Chat2Note browser extension installed (Chromium- or Firefox-based browsers)

## Step 1: Prepare Your Notion Database

1. Create a new database or pick an existing one for AI notes.
2. Add the properties you want Chat2Note to populate. The default property mappings expect:
   - **Title** – conversation title or first prompt
   - **Date** (Date) – export or conversation timestamp
   - **Platform** (Select/Multi-select/Text) – source platform (ChatGPT, Claude, etc.)
   - **Source URL** (URL/Text) – original chat link when available
   - **Message Count** (Number) – total messages in the export
3. Copy the **Database ID** from the database URL. It is the 32-character string between the workspace slug and the `?v=` query parameter.

## Step 2: Create a Notion Integration Token

1. Visit [notion.so/my-integrations](https://www.notion.so/my-integrations) and create a new internal integration.
2. Give it a descriptive name (e.g., “Chat2Note Export”).
3. Enable the **Read content**, **Update content**, and **Insert content** capabilities.
4. Copy the generated token (starts with `secret_`). You will paste this into Chat2Note; the extension encrypts it before saving.

## Step 3: Grant the Integration Access to Your Database

1. Open the database in Notion.
2. Click **Share → Invite**.
3. Search for the integration you just created and grant it **Full access**.

## Step 4: Configure Chat2Note

1. Open the Chat2Note **Options** page and choose **Integrations → Notion**.
2. Enable the **Notion integration** toggle.
3. Paste the **Database ID** and **API token** into the corresponding fields. (The token is stored encrypted and replaced by `***encrypted***` after saving.)
4. Review the **Property mappings** section. You can rename the target properties or disable fields that do not exist in your database.
5. Decide whether **Include database properties** should stay enabled. Disabling it creates the page content without updating the property fields.
6. Click **Test connection** to confirm the credentials and database access.

## Exporting Conversations

1. Start a conversation on a supported AI platform and click the Chat2Note export button.
2. Choose **Markdown** as the export format for the best Notion compatibility (JSON is also supported if you need structured data).
3. Select **Notion** as the target.
4. (Pro) Toggle **Include metadata** to add timestamps, platform names, model details, and source URLs to the Markdown body.
5. (Pro) Apply custom Markdown templates (Options → Export) if you need to change the structure of the conversation or file name.
6. Click **Export**. Chat2Note converts the Markdown to Notion blocks and creates a new page in the configured database.

### What Chat2Note Sends to Notion

- The conversation rendered as Markdown and converted to native Notion blocks (using the Martian library).
- Property updates for Source URL, Exported At, Platform, and Message Count (when enabled).
- Optional metadata appended to the top of the page body (requires Pro membership).

## Managing Property Mappings

Chat2Note ships with sensible defaults for property names, but every workspace is different. In the options page you can:

- Rename each mapping to match your database columns. Chat2Note tries fallback names like “URL”, “Link”, or “Messages” if an exact match is not found.
- Disable a property entirely if your database does not need it.
- Toggle **Include database properties** off to create pages without touching the database schema (useful for template testing).

Changes are saved immediately when you click **Save settings**, and the floating “Save” button reminds you when there are unsaved edits.

## Privacy & Security

- API tokens and configuration secrets are encrypted in browser storage (`CryptoUtils` handles all encryption/decryption).
- All Markdown conversion happens locally; Chat2Note only talks to Notion's API endpoints necessary for page creation.
- Use **Options → Advanced → Export Config** to back up your integration settings securely.

## Troubleshooting

| Issue                                     | Solution                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **“Invalid database ID”**                 | Ensure you copied the database ID (32 characters) and not a page ID. The database must also be shared with your integration.                          |
| **“Failed to initialize Notion service”** | Re-check the API token, database ID, and integration permissions. Use the **Test connection** button to see detailed errors in the extension console. |
| **Properties are not updated**            | Confirm the property names in Chat2Note match the database schema. Use the fallback names or disable the property if it does not exist.               |
| **Metadata missing**                      | Metadata in the Markdown body requires an active Pro membership and the **Include metadata** toggle enabled during export.                            |

With the Notion integration configured, every AI conversation can land in a structured database complete with metadata, backlinks, and automations.
