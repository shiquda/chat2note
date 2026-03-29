---
title: Obsidian Integration
description: Configure Chat2Note to export conversations into your Obsidian vault via the obsidian:// URI scheme.
---

# Obsidian Integration

Chat2Note can open your Obsidian vault and insert Markdown notes using the official `obsidian://` URI handler. Everything runs locally—no files are uploaded to third-party servers.

## Prerequisites

- Obsidian installed on your computer
- At least one local vault
- Chat2Note browser extension installed (Chromium- or Firefox-based browsers)

## Step 1: Enable `obsidian://` URLs

1. Launch Obsidian and open **Settings → Files & Links**.
2. Under **Obsidian URI**, enable **"Allow obsidian:// URLs to open Obsidian"**.
3. Keep Obsidian running while testing the integration. The URI handler wakes the app if it is closed, but keeping it open ensures exports succeed instantly.

## Step 2: Gather Vault Details

Chat2Note needs to know which vault and folder should receive new notes.

- **Vault name** – matches the folder name displayed in the vault switcher (case-sensitive).
- **Folder path** – relative path inside the vault (e.g., `Chat2Note/Claude`). Leave blank to use the vault root.
- **Open mode** – choose whether Obsidian should open the newly created note, reveal it in the file explorer, or stay quiet.

## Step 3: Configure Chat2Note

1. Open the Chat2Note **Options** page and go to **Integrations → Obsidian**.
2. Enable the **Obsidian integration** toggle.
3. Enter your **vault name** and optional **folder path**.
4. Choose your preferred **open mode**:
   - **Open note** – launch Obsidian focused on the new note.
   - **Open vault** – bring Obsidian to the foreground without opening the file.
   - **Do nothing** – create the file silently.
5. Decide whether to keep **Strict Markdown mode** enabled. When turned on, Chat2Note forces the export format to Markdown to guarantee compatibility.
6. (Pro) Toggle **Include YAML frontmatter** if you want metadata (source, timestamp, platform, etc.) added to the top of each note.
7. Review the live **Path preview** shown under the settings to verify the target location.
8. Click **Save settings** and optionally run a quick export to confirm the configuration.

## Exporting Conversations

1. Open a supported AI chat platform.
2. Click the Chat2Note floating export button.
3. Select **Markdown** as the format (required when Strict Markdown is on).
4. Choose **Obsidian** as the target.
5. (Pro) Enable **Include metadata** in the export dialog if you want timestamps and source links inside the body of the note.
6. Click **Export**. Chat2Note triggers the `obsidian://new` URI with your vault, folder, and generated Markdown. Obsidian creates the file and opens or queues it based on your open mode.

### File Naming & Templates

- Chat2Note sanitizes filenames automatically (removing invalid characters and collapsing whitespace).
- Use the **Export → File name template** setting (Pro) to control file naming. The default is `{{title}}_{{date}}`.
- Global Markdown and message templates (Pro) also apply to Obsidian exports, letting you customize headers, footers, and per-message formatting.

## Troubleshooting

| Issue                             | Solution                                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Obsidian does not open**        | Confirm the `obsidian://` handler is enabled and Obsidian is installed for the current user.                                                             |
| **File saved to the wrong place** | Double-check the vault name (case-sensitive) and folder path. Avoid leading or trailing slashes.                                                         |
| **Exported note is empty**        | Ensure the export format is Markdown. Strict Markdown prevents JSON/TXT exports when Obsidian is the default target.                                     |
| **Metadata missing**              | YAML frontmatter requires Pro membership and the toggle enabled in settings. In-body metadata also requires enabling **Include metadata** during export. |
| **Multiple notes created**        | Obsidian creates a new file if a duplicate name exists. Customize the file name template to include timestamps or identifiers.                           |

## Best Practices

- Create a dedicated folder (e.g., `Chat2Note/Platform`) so exported conversations do not clutter existing notes.
- Combine Chat2Note metadata with Obsidian plugins such as Dataview for advanced querying.
- Use Obsidian Sync, Git, or another synchronization method to access exports across devices.
- Export your Chat2Note configuration periodically (Options → Advanced) for easy restoration on new machines.

With the Obsidian integration configured, every AI conversation arrives as a ready-to-edit Markdown note in your vault.
