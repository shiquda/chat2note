/**
 * 悬浮窗图标定义 - 从 Tabler Icons SVG 文件动态提取
 *
 * ⚠️  此文件由 scripts/extract-svg-files.js 自动生成，请勿手动修改！
 * 如需更新图标，请运行: pnpm extract-icons
 *
 * 生成时间: 2025-10-04T06:40:08.507Z
 */

type ExportIconType = 'local' | 'notion' | 'clipboard' | 'obsidian' | 'siyuan' | 'joplin'

interface PathDefinition {
  d: string
  attrs?: Record<string, string>
}

export function createIcon(type: ExportIconType): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.classList.add('chat2note-option-icon')

  // 从 Tabler Icons SVG 文件提取的路径
  const paths: Record<ExportIconType, PathDefinition[]> = {
    local: [
      {
        d: 'M14 3v4a1 1 0 0 0 1 1h4',
      },
      {
        d: 'M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z',
      },
      {
        d: 'M12 17v-6',
      },
      {
        d: 'M9.5 14.5l2.5 2.5l2.5 -2.5',
      },
    ],
    notion: [
      {
        d: 'M11 17.5v-6.5h.5l4 6h.5v-6.5',
      },
      {
        d: 'M19.077 20.071l-11.53 .887a1 1 0 0 1 -.876 -.397l-2.471 -3.294a1 1 0 0 1 -.2 -.6v-10.741a1 1 0 0 1 .923 -.997l11.389 -.876a2 2 0 0 1 1.262 .33l1.535 1.023a2 2 0 0 1 .891 1.664v12.004a1 1 0 0 1 -.923 .997z',
      },
      {
        d: 'M4.5 5.5l2.5 2.5',
      },
      {
        d: 'M20 7l-13 1v12.5',
      },
    ],
    clipboard: [
      {
        d: 'M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2',
      },
      {
        d: 'M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z',
      },
      {
        d: 'M9 12l.01 0',
      },
      {
        d: 'M13 12l2 0',
      },
      {
        d: 'M9 16l.01 0',
      },
      {
        d: 'M13 16l2 0',
      },
    ],
    siyuan: [
      {
        d: 'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0',
      },
      {
        d: 'M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0',
      },
      {
        d: 'M3 6l0 13',
      },
      {
        d: 'M12 6l0 13',
      },
      {
        d: 'M21 6l0 13',
      },
    ],
    joplin: [
      {
        d: 'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0',
      },
      {
        d: 'M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0',
      },
      {
        d: 'M3 6l0 13',
      },
      {
        d: 'M12 6l0 13',
      },
      {
        d: 'M21 6l0 13',
      },
    ],
    obsidian: [{ d: 'M12 2l6 5l-2 12l-4 3l-4 -3l-2 -12z' }, { d: 'M12 2v18' }, { d: 'M6 7l12 0' }],
  }

  paths[type].forEach(pathDefinition => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathDefinition.d)
    if (pathDefinition.attrs) {
      Object.entries(pathDefinition.attrs).forEach(([key, value]) => {
        path.setAttribute(key, value)
      })
    }
    svg.appendChild(path)
  })

  return svg
}

/**
 * Get the main export button icon SVG
 * @returns SVG string
 */
export function getMainButtonIcon(): string {
  return `
<svg class="chat2note-main-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 3v12"></path>
  <path d="M8 11l4 4 4-4"></path>
  <path d="M5 17h14"></path>
</svg>`
}
