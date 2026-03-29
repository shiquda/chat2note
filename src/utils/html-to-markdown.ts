/**
 * Convert HTML content to Markdown format
 * Handles common HTML elements found in AI chat responses
 */
export function htmlToMarkdown(element: Element): string {
  const clone = element.cloneNode(true) as Element

  // Remove unwanted elements (buttons, inputs, etc.)
  const unwantedSelectors = [
    'button',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    'mat-icon',
    'svg',
    '.mat-mdc-button-touch-target',
    '.mat-focus-indicator',
  ]
  unwantedSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove())
  })

  return convertNode(clone)
}

function convertNode(node: Node): string {
  // Handle text nodes
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.trim() || ''
  }

  // Handle element nodes
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element
    const tagName = element.tagName.toLowerCase()

    // Process children first
    const children = Array.from(element.childNodes)
      .map(child => convertNode(child))
      .filter(text => text.length > 0)

    const content = children.join('')

    // Convert based on tag type
    switch (tagName) {
      // Headings
      case 'h1':
        return `\n# ${content}\n`
      case 'h2':
        return `\n## ${content}\n`
      case 'h3':
        return `\n### ${content}\n`
      case 'h4':
        return `\n#### ${content}\n`
      case 'h5':
        return `\n##### ${content}\n`
      case 'h6':
        return `\n###### ${content}\n`

      // Paragraphs and line breaks
      case 'p':
        return `\n${content}\n`
      case 'br':
        return '\n'
      case 'div':
        // For divs, just add a line break if it has block-level content
        return content ? `${content}\n` : ''

      // Text formatting
      case 'strong':
      case 'b':
        return `**${content}**`
      case 'em':
      case 'i':
        return `*${content}*`
      case 'code':
        // Check if it's inside a pre (code block) or inline code
        if (element.closest('pre')) {
          return content
        }
        return `\`${content}\``
      case 'pre': {
        // Extract language from class if available
        const codeElement = element.querySelector('code')
        const className = codeElement?.className || ''
        const langMatch = className.match(/language-(\w+)/)
        const lang = langMatch ? langMatch[1] : ''
        return `\n\`\`\`${lang}\n${content}\n\`\`\`\n`
      }

      // Lists
      case 'ul':
        return `\n${content}\n`
      case 'ol':
        return `\n${content}\n`
      case 'li': {
        const parent = element.parentElement
        if (parent?.tagName.toLowerCase() === 'ol') {
          // For ordered lists, find the index
          const index = Array.from(parent.children).indexOf(element) + 1
          const startAttr = parent.getAttribute('start')
          const start = startAttr ? parseInt(startAttr, 10) : 1
          return `${index + start - 1}. ${content}\n`
        }
        // Unordered list
        return `- ${content}\n`
      }

      // Links
      case 'a': {
        const href = element.getAttribute('href')
        if (href) {
          return `[${content}](${href})`
        }
        return content
      }

      // Images
      case 'img': {
        const src = element.getAttribute('src')
        const alt = element.getAttribute('alt') || ''
        if (src) {
          return `![${alt}](${src})`
        }
        return alt
      }

      // Blockquotes
      case 'blockquote':
        return `\n> ${content.split('\n').filter(l => l.trim()).join('\n> ')}\n`

      // Horizontal rules
      case 'hr':
        return '\n---\n'

      // Tables
      case 'table':
        return convertTable(element)

      // Span and other inline elements - just return content
      case 'span':
        return content

      // Default: just return the content
      default:
        return content
    }
  }

  return ''
}

function convertTable(table: Element): string {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (rows.length === 0) {
    return ''
  }

  const markdownRows: string[] = []

  rows.forEach((row, index) => {
    const cells = Array.from(row.querySelectorAll('th, td'))
    const cellContents = cells.map(cell => convertNode(cell).trim())
    markdownRows.push(`| ${cellContents.join(' | ')} |`)

    // Add separator after header row
    if (index === 0 && row.querySelector('th')) {
      const separator = cells.map(() => '---').join(' | ')
      markdownRows.push(`| ${separator} |`)
    }
  })

  return `\n${markdownRows.join('\n')}\n`
}

/**
 * Clean up the converted markdown text
 */
export function cleanMarkdown(text: string): string {
  return (
    text
      // Remove excessive blank lines (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace
      .trim()
      // Normalize spaces (but preserve intentional multiple spaces in code)
      .split('\n')
      .map(line => {
        // Don't touch lines that look like code blocks or are indented
        if (line.startsWith('```') || line.startsWith('    ') || line.startsWith('\t')) {
          return line
        }
        // Normalize spaces in regular lines
        return line.replace(/[ \t]+/g, ' ')
      })
      .join('\n')
  )
}
