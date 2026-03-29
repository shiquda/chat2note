/**
 * Handle Obsidian export in content script context
 * Uses clipboard approach like Cherry Studio to avoid URI length limits
 * @param uris - Array of obsidian:// URIs to open
 * @param clipboardContent - Content to copy to clipboard before opening URI
 * @returns Success or error result
 */
export async function handleObsidianExport(
  uris: string[],
  clipboardContent?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Obsidian Handler] Opening URIs:', uris)
    console.log('[Obsidian Handler] Has clipboard content:', !!clipboardContent)

    if (!uris || uris.length === 0) {
      return { success: false, error: 'No URIs provided' }
    }

    // Step 1: Copy content to clipboard if provided
    if (clipboardContent) {
      try {
        await navigator.clipboard.writeText(clipboardContent)
        console.log(
          '[Obsidian Handler] Content copied to clipboard, length:',
          clipboardContent.length
        )
      } catch (clipboardError) {
        console.error('[Obsidian Handler] Failed to copy to clipboard:', clipboardError)
        // Try fallback method
        const textArea = document.createElement('textarea')
        textArea.value = clipboardContent
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (!success) {
          return { success: false, error: 'Failed to copy content to clipboard' }
        }
        console.log('[Obsidian Handler] Content copied to clipboard using fallback method')
      }
    }

    // Step 2: Open the URI
    const uri = uris[0]
    console.log('[Obsidian Handler] Opening URI:', uri.substring(0, 200))

    // Create a temporary link and click it to trigger protocol handler
    const link = document.createElement('a')
    link.href = uri
    link.style.display = 'none'
    document.body.appendChild(link)

    console.log('[Obsidian Handler] Created link element, triggering click')
    link.click()

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link)
      console.log('[Obsidian Handler] Link element removed')
    }, 100)

    // If there's a second URI (for opening vault), open it after a delay
    if (uris.length > 1) {
      setTimeout(() => {
        console.log('[Obsidian Handler] Opening second URI:', uris[1])
        const link2 = document.createElement('a')
        link2.href = uris[1]
        link2.style.display = 'none'
        document.body.appendChild(link2)
        link2.click()
        setTimeout(() => document.body.removeChild(link2), 100)
      }, 1000)
    }

    console.log('[Obsidian Handler] URIs triggered successfully')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open Obsidian URI'
    console.error('[Obsidian Handler] Error:', message)
    return { success: false, error: message }
  }
}
