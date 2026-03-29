#!/usr/bin/env node

/**
 * 从 SVG 文件中提取图标路径
 * 这是最可靠的方法，直接读取 Tabler Icons 的原始 SVG 文件
 */

import { writeFile, readFile, access } from 'fs/promises'
import { join } from 'path'
import { execSync } from 'child_process'

// 图标映射关系 - Tabler Icons SVG 文件名
const ICONS_TO_SYNC = {
  local: 'file-download',
  notion: 'brand-notion',
  clipboard: 'clipboard-list',
  siyuan: 'book',
}

/**
 * 从 Tabler Icons 的原始 SVG 文件中提取路径
 */
async function extractSvgPathsFromSvgFile(iconName) {
  try {
    // Tabler Icons SVG 文件的多种可能路径
    const possiblePaths = [
      join(process.cwd(), 'node_modules/@tabler/icons/icons', `${iconName}.svg`),
      join(
        process.cwd(),
        'node_modules/.pnpm/@tabler+icons@*/node_modules/@tabler/icons/icons',
        `${iconName}.svg`
      ),
    ]

    // 使用 find 命令查找 SVG 文件
    let svgPath = null
    try {
      const result = execSync(`find node_modules -name "${iconName}.svg" -type f | head -1`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      }).trim()

      if (result) {
        svgPath = result
        console.log(`📁 找到 ${iconName}.svg: ${svgPath}`)
      }
    } catch {
      console.log(`🔍 使用备用路径查找 ${iconName}.svg...`)
    }

    // 如果 find 失败，尝试预定义路径
    if (!svgPath) {
      for (const path of possiblePaths) {
        try {
          await access(path)
          svgPath = path
          console.log(`📁 找到 ${iconName}.svg: ${path}`)
          break
        } catch {
          continue
        }
      }
    }

    if (!svgPath) {
      throw new Error(`未找到 ${iconName}.svg 文件`)
    }

    // 读取 SVG 文件内容
    const svgContent = await readFile(svgPath, 'utf-8')
    console.log(`📖 成功读取 ${iconName}.svg`)

    // 解析 SVG 内容提取路径
    const paths = []

    // 提取所有 path 元素
    const pathRegex = /<path[^>]*d="([^"]*)"[^>]*>/g
    let match

    while ((match = pathRegex.exec(svgContent)) !== null) {
      const d = match[1]
      if (d && d.trim()) {
        // 过滤掉背景路径和不需要的路径
        if (d === 'M0 0h24v24H0z' || d === 'M0 0h24v24H0Z') {
          continue // 跳过背景矩形
        }

        const pathData = { d: d.trim() }

        // 提取其他属性
        const pathElement = match[0]
        const attrs = {}

        const strokeLinecapMatch = pathElement.match(/stroke-linecap="([^"]*)"/)
        const strokeLinejoinMatch = pathElement.match(/stroke-linejoin="([^"]*)"/)
        const fillMatch = pathElement.match(/fill="([^"]*)"/)
        const strokeMatch = pathElement.match(/stroke="([^"]*)"/)

        if (strokeLinecapMatch) attrs['stroke-linecap'] = strokeLinecapMatch[1]
        if (strokeLinejoinMatch) attrs['stroke-linejoin'] = strokeLinejoinMatch[1]
        if (fillMatch && fillMatch[1] !== 'none') attrs.fill = fillMatch[1]
        if (strokeMatch && strokeMatch[1] !== 'currentColor') attrs.stroke = strokeMatch[1]

        if (Object.keys(attrs).length > 0) {
          pathData.attrs = attrs
        }

        paths.push(pathData)
      }
    }

    console.log(`✅ ${iconName}: 提取到 ${paths.length} 个路径`)
    paths.forEach((path, index) => {
      console.log(`   路径 ${index + 1}: ${path.d.substring(0, 60)}...`)
    })

    return paths
  } catch (error) {
    console.error(`❌ 提取 ${iconName} 失败:`, error.message)
    return []
  }
}

/**
 * 生成图标代码
 */
function generateIconCode(allPaths) {
  console.log('📝 生成图标代码...')

  const code = `/**
 * 悬浮窗图标定义 - 从 Tabler Icons SVG 文件动态提取
 *
 * ⚠️  此文件由 scripts/extract-svg-files.js 自动生成，请勿手动修改！
 * 如需更新图标，请运行: pnpm extract-icons
 *
 * 生成时间: ${new Date().toISOString()}
 */

type ExportIconType = 'local' | 'notion' | 'clipboard' | 'obsidian' | 'siyuan'

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
${Object.entries(ICONS_TO_SYNC)
  .map(([exportType, iconName]) => {
    const paths = allPaths[iconName] || []
    return `    ${exportType}: [\n${paths
      .map(path => {
        let pathStr = `      {\n        d: '${path.d}'`
        if (path.attrs && Object.keys(path.attrs).length > 0) {
          pathStr += ',\n        attrs: ' + JSON.stringify(path.attrs)
        }
        pathStr += '\n      }'
        return pathStr
      })
      .join(',\n')}\n    ]`
  })
  .join(',\n')},
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
  return \`
<svg class="chat2note-main-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 3v12"></path>
  <path d="M8 11l4 4 4-4"></path>
  <path d="M5 17h14"></path>
</svg>\`
}
`

  return code
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始从 SVG 文件提取图标路径...')

  try {
    const allPaths = {}

    // 检查是否有 @tabler/icons 包
    try {
      await access('node_modules/@tabler/icons')
      console.log('✅ 找到 @tabler/icons 包')
    } catch {
      console.log('📦 正在安装 @tabler/icons...')
      execSync('pnpm add -D @tabler/icons', { stdio: 'inherit' })
      console.log('✅ @tabler/icons 安装完成')
    }

    // 提取每个图标的路径
    for (const [exportType, iconName] of Object.entries(ICONS_TO_SYNC)) {
      console.log(`\n🔍 提取 ${iconName} (${exportType})...`)
      const paths = await extractSvgPathsFromSvgFile(iconName)
      allPaths[iconName] = paths

      if (paths.length === 0) {
        console.warn(`⚠️  ${iconName} 提取失败，将使用后备路径`)
        // 使用已知正确的后备路径
        const fallbackPaths = {
          'file-download': [
            { d: 'M14 3v4a1 1 0 0 0 1 1h4' },
            { d: 'M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z' },
          ],
          'brand-notion': [
            { d: 'M11 17.5v-6.5h.5l4 6h.5v-6.5' },
            {
              d: 'M19.077 20.071l-11.53.887a1 1 0 0 1-.876-.397l-2.471-3.294a1 1 0 0 1-.2-.6V5.926a1 1 0 0 1 .923-.997l11.389-.876a2 2 0 0 1 1.262.33l1.535 1.023a2 2 0 0 1 .891 1.664V19.074a1 1 0 0 1-.923.997Z',
            },
            { d: 'M4.5 5.5l2.5 2.5' },
            { d: 'M20 7l-13 1v12.5' },
          ],
          'clipboard-list': [
            {
              d: 'M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2',
            },
            { d: 'M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z' },
          ],
          book: [
            {
              d: 'M4 19.5a2.5 2.5 0 0 1 2.5 -2.5h7a2.5 2.5 0 0 1 2.5 2.5v1.5a2.5 2.5 0 0 1 -2.5 2.5h-7a2.5 2.5 0 0 1 -2.5 -2.5v-1.5z',
            },
            {
              d: 'M4 4.5a2.5 2.5 0 0 1 2.5 -2.5h7a2.5 2.5 0 0 1 2.5 2.5v1.5a2.5 2.5 0 0 1 -2.5 2.5h-7a2.5 2.5 0 0 1 -2.5 -2.5v-1.5z',
            },
            { d: 'M16 4v13' },
            { d: 'M8 4v13' },
          ],
        }

        if (fallbackPaths[iconName]) {
          allPaths[iconName] = fallbackPaths[iconName]
          console.log(`🔄 ${iconName}: 使用后备路径`)
        }
      }
    }

    // 生成代码
    const code = generateIconCode(allPaths)
    const outputPath = join(process.cwd(), 'src/content-scripts/utils/icons.ts')

    await writeFile(outputPath, code, 'utf-8')

    console.log(`\n✅ 图标提取完成！文件已更新: ${outputPath}`)
    console.log('🎉 悬浮窗和设置页面的图标现在完全一致了！')
    console.log('\n💡 这个脚本会：')
    console.log('   1. 自动从 Tabler Icons 的原始 SVG 文件中提取路径')
    console.log('   2. 确保与设置页面使用完全相同的图标')
    console.log('   3. 支持图标更新时自动同步')
    console.log('\n📝 未来添加新图标时：')
    console.log('   1. 在 ICONS_TO_SYNC 中添加映射关系')
    console.log('   2. 运行 pnpm extract-icons')
    console.log('   3. 更新 ui-constants.ts 中的图标导入')
  } catch (error) {
    console.error('\n❌ 提取失败:', error.message)
    console.log('\n🔧 解决方案：')
    console.log('   1. 确保有权限访问 node_modules')
    console.log('   2. 运行 pnpm install 更新依赖')
    console.log('   3. 检查是否正确安装了 @tabler/icons')
    process.exit(1)
  }
}

main()
