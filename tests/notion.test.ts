import { describe, it, expect, beforeEach } from 'vitest'
import { NotionService } from '../src/services/notion'
import { markdownToBlocks } from '@tryfabric/martian'
import { NotionTestHelpers } from '../src/utils/notion-test-helpers'
import type { NotionBlock } from '../src/types/notion'

// 模拟的Notion服务类，专门用于测试表格修复功能
class TestableNotionService extends NotionService {
  // 暴露私有方法用于测试
  public testFixTableInconsistencies(markdown: string): string {
    return (
      this as unknown as { fixTableInconsistencies: (markdown: string) => string }
    ).fixTableInconsistencies(markdown)
  }

  public testFixTableColumns(tableLines: string[], expectedColumnCount: number): string[] {
    return (
      this as unknown as { fixTableColumns: (lines: string[], count: number) => string[] }
    ).fixTableColumns(tableLines, expectedColumnCount)
  }

  public testParseMarkdownToBlocks(markdown: string): NotionBlock[] {
    return (
      this as unknown as { parseMarkdownToBlocks: (markdown: string) => NotionBlock[] }
    ).parseMarkdownToBlocks(markdown)
  }
}

describe('Notion Table Fixing', () => {
  let service: TestableNotionService

  beforeEach(() => {
    service = new TestableNotionService()
  })

  describe('fixTableColumns', () => {
    it('should handle tables with correct number of columns', () => {
      const tableLines = [
        '| 食物 | 分量 | 热量 |',
        '|------|------|------|',
        '| 煮蛋1个 + 无糖黑咖啡 | — | 90 kcal |',
        '| 鸡胸肉沙拉 | — | 250 kcal |',
      ]

      const result = service.testFixTableColumns(tableLines, 3)

      expect(result).toEqual(tableLines)
    })

    it('should fix tables with missing columns', () => {
      const tableLines = [
        '| 食物 | 分量 | 热量 |',
        '|------|------|------|',
        '| 断食日摄入 600 kcal | 约为平日三餐热量总量的 1/3 |',
        '| 跑步6公里消耗 | ≈400–600 kcal | 相当于把一顿饭跑掉 |',
      ]

      const expected = [
        '| 食物 | 分量 | 热量 |',
        '|------|------|------|',
        '| 断食日摄入 600 kcal | 约为平日三餐热量总量的 1/3 | |',
        '| 跑步6公里消耗 | ≈400–600 kcal | 相当于把一顿饭跑掉 |',
      ]

      const result = service.testFixTableColumns(tableLines, 3)

      expect(result).toEqual(expected)
    })

    it('should fix tables with extra columns by merging them', () => {
      const tableLines = [
        '| 食物 | 分量 | 热量 |',
        '|------|------|------|',
        '| 复杂食物 | 100g | 200 kcal | 额外信息1 | 额外信息2 |',
      ]

      const result = service.testFixTableColumns(tableLines, 3)

      // 检查结果有正确的行数
      expect(result.length).toBe(3)

      // 检查修复后的行只有3列
      const fixedLine = result[2]
      const parts = fixedLine.split('|').slice(1, -1) // 去掉首尾空元素
      expect(parts.length).toBe(3)

      // 检查内容合并了额外列
      expect(fixedLine).toContain('200 kcal')
      expect(fixedLine).toContain('额外信息1')
      expect(fixedLine).toContain('额外信息2')
    })

    it('should handle table separators correctly', () => {
      const tableLines = ['| 列1 | 列2 | 列3 |', '|:---|:----:|---:|', '| 数据1 | 数据2 | 数据3 |']

      const result = service.testFixTableColumns(tableLines, 3)

      expect(result).toEqual(tableLines)
    })

    it('should handle non-table lines gracefully', () => {
      const tableLines = ['| 列1 | 列2 |', '这不是表格行', '| 数据1 | 数据2 |']

      const result = service.testFixTableColumns(tableLines, 2)

      expect(result[0]).toBe('| 列1 | 列2 |')
      expect(result[1]).toBe('这不是表格行')
      expect(result[2]).toBe('| 数据1 | 数据2 |')
    })
  })

  describe('fixTableInconsistencies', () => {
    it('should pass through non-table content unchanged', () => {
      const markdown = `# 标题

这是一段普通文本。

- 列表项1
- 列表项2

更多文本。`

      const result = service.testFixTableInconsistencies(markdown)

      expect(result).toBe(markdown)
    })

    it('should fix single problematic table', () => {
      const markdown = `| 情境 | 热量约 | 等价说明 |
|------|--------|----------|
| 断食日摄入 600 kcal | 约为平日三餐热量总量的 1/3 |
| 跑步6公里消耗 | ≈400–600 kcal | 相当于把一顿饭跑掉 |`

      const result = service.testFixTableInconsistencies(markdown)

      // 检查修复后的表格行有正确的列数
      const lines = result.split('\n')
      const problemLine = lines[2] // 第一个数据行
      const parts = problemLine.split('|').slice(1, -1) // 去掉首尾空元素
      expect(parts.length).toBe(3) // 应该有3列

      // 检查空列被添加到末尾
      expect(problemLine).toMatch(/\|\s*\|$/) // 以 | | 结尾
    })

    it('should handle multiple tables in the same document', () => {
      const markdown = `第一个表格：
| 食物 | 分量 | 热量 |
|------|------|------|
| 苹果 | 1个 | 52 kcal |

中间文本

第二个表格：
| 情境 | 热量约 | 等价说明 |
|------|--------|----------|
| 断食日摄入 | 600 kcal | 约1/3平日热量 |
| 跑步 | 400 kcal | 消耗 |`

      const expected = `第一个表格：
| 食物 | 分量 | 热量 |
|------|------|------|
| 苹果 | 1个 | 52 kcal |

中间文本

第二个表格：
| 情境 | 热量约 | 等价说明 |
|------|--------|----------|
| 断食日摄入 | 600 kcal | 约1/3平日热量 |
| 跑步 | 400 kcal | 消耗 |`

      const result = service.testFixTableInconsistencies(markdown)

      expect(result).toBe(expected)
    })

    it('should handle the problematic table from the real file', () => {
      const problematicTable = `### 🍚 示例3：简化家常版

| 食物 | 分量 | 热量 |
|------|------|------|
| 粗粮粥（燕麦/小米） | 1小碗（200ml） | 90 kcal |
| 水煮青菜 | 200g | 60 kcal |
| 蒸鱼（草鱼或鲈鱼） | 150g | 200 kcal |
| 豆腐 | 半块（100g） | 90 kcal |
| 总计 | — | **≈440 kcal** |

再加一小个水果（如橙子 100g ≈50 kcal）即可达 500 kcal 左右。`

      const result = service.testFixTableInconsistencies(problematicTable)

      // 应该保持表格完整性，同时保留后续文本
      expect(result).toContain('| 食物 | 分量 | 热量 |')
      expect(result).toContain('| 粗粮粥（燕麦/小米） | 1小碗（200ml） | 90 kcal |')
      expect(result).toContain('再加一小个水果（如橙子 100g ≈50 kcal）即可达 500 kcal 左右。')
    })
  })

  describe('parseMarkdownToBlocks Integration', () => {
    it('should successfully convert fixed tables to Notion blocks', () => {
      const problematicMarkdown = `| 情境 | 热量约 | 等价说明 |
|------|--------|----------|
| 断食日摄入 600 kcal | 约为平日三餐热量总量的 1/3 |
| 跑步6公里消耗 | ≈400–600 kcal | 相当于把一顿饭跑掉 |`

      const blocks = service.testParseMarkdownToBlocks(problematicMarkdown)

      expect(blocks.length).toBeGreaterThan(0)

      // 使用类型安全的辅助方法
      const tableBlocks = NotionTestHelpers.getTableBlocks(blocks)
      expect(tableBlocks.length).toBe(1)

      const tableBlock = tableBlocks[0]
      const tableInfo = NotionTestHelpers.getTableInfo(tableBlock)

      expect(tableInfo.width).toBe(3)
      expect(tableInfo.isConsistent).toBe(true)
      expect(tableInfo.rowCount).toBe(3) // header + 2 data rows
    })

    it('should handle the exact problematic case from the error', () => {
      const exactProblematicCase = `| 情境 | 热量约 | 等价说明 |
|------|--------|----------|
| 断食日摄入 600 kcal | 约为平日三餐热量总量的 1/3 |
| 跑步6公里消耗 | ≈400–600 kcal | 相当于把一顿饭跑掉 |
| 星巴克大杯拿铁 + 蓝莓松饼 | ≈580 kcal | 很多人早餐就"吃掉了"断食日额度 |`

      // 测试原始markdown会产生问题
      const originalBlocks = markdownToBlocks(exactProblematicCase)
      const originalTableBlocks = NotionTestHelpers.getTableBlocks(originalBlocks)

      if (originalTableBlocks.length > 0) {
        const originalTableInfo = NotionTestHelpers.getTableInfo(originalTableBlocks[0])
        const originalConsistency = NotionTestHelpers.validateTableConsistency(
          originalTableBlocks[0]
        )

        // 验证原始数据有问题
        expect(originalTableInfo.width).toBe(3)
        expect(originalConsistency.isValid).toBe(false)
        expect(originalConsistency.problematicRows.length).toBeGreaterThan(0)
      }

      // 测试修复后的markdown会成功
      const blocks = service.testParseMarkdownToBlocks(exactProblematicCase)
      const tableBlocks = NotionTestHelpers.getTableBlocks(blocks)

      expect(tableBlocks.length).toBe(1)

      const tableInfo = NotionTestHelpers.getTableInfo(tableBlocks[0])
      const consistency = NotionTestHelpers.validateTableConsistency(tableBlocks[0])

      expect(tableInfo.width).toBe(3)
      expect(tableInfo.rowCount).toBe(4) // header + 3 data rows
      expect(consistency.isValid).toBe(true)
      expect(consistency.problematicRows.length).toBe(0)
    })
  })
})
