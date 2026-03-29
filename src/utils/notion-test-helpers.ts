/**
 * Notion 测试辅助工具 - 提供类型安全的测试方法
 */

import type { NotionBlock, TableBlock, TableRowBlock } from '../types/notion'

export class NotionTestHelpers {
  /**
   * 安全地从 NotionBlock 中提取表格块
   */
  static getTableBlocks(blocks: NotionBlock[]): TableBlock[] {
    return blocks.filter((block): block is TableBlock => block.type === 'table')
  }

  /**
   * 安全地从表格块中提取行
   */
  static getTableRows(tableBlock: TableBlock): TableRowBlock[] {
    return tableBlock.table.children.filter((row): row is TableRowBlock => row.type === 'table_row')
  }

  /**
   * 检查表格的列数一致性
   */
  static validateTableConsistency(tableBlock: TableBlock): {
    isValid: boolean
    expectedColumns: number
    problematicRows: { rowIndex: number; actualColumns: number }[]
  } {
    const rows = this.getTableRows(tableBlock)
    const expectedColumns = tableBlock.table.table_width
    const problematicRows: { rowIndex: number; actualColumns: number }[] = []

    rows.forEach((row, index) => {
      const actualColumns = row.table_row.cells.length
      if (actualColumns !== expectedColumns) {
        problematicRows.push({
          rowIndex: index,
          actualColumns,
        })
      }
    })

    return {
      isValid: problematicRows.length === 0,
      expectedColumns,
      problematicRows,
    }
  }

  /**
   * 获取表格块的详细信息
   */
  static getTableInfo(tableBlock: TableBlock): {
    width: number
    hasColumnHeader: boolean
    hasRowHeader: boolean
    rowCount: number
    columnCounts: number[]
    isConsistent: boolean
  } {
    const rows = this.getTableRows(tableBlock)
    const columnCounts = rows.map(row => row.table_row.cells.length)
    const consistency = this.validateTableConsistency(tableBlock)

    return {
      width: tableBlock.table.table_width,
      hasColumnHeader: tableBlock.table.has_column_header,
      hasRowHeader: tableBlock.table.has_row_header,
      rowCount: rows.length,
      columnCounts,
      isConsistent: consistency.isValid,
    }
  }

  /**
   * 格式化表格信息用于调试
   */
  static formatTableInfo(tableBlock: TableBlock): string {
    const info = this.getTableInfo(tableBlock)
    const consistency = this.validateTableConsistency(tableBlock)

    let result = `表格信息:\n`
    result += `  宽度: ${info.width} 列\n`
    result += `  行数: ${info.rowCount} 行\n`
    result += `  有列标题: ${info.hasColumnHeader}\n`
    result += `  有行标题: ${info.hasRowHeader}\n`
    result += `  列数一致性: ${info.isConsistent ? '✅' : '❌'}\n`

    if (!info.isConsistent) {
      result += `  问题行:\n`
      consistency.problematicRows.forEach(problem => {
        result += `    第${problem.rowIndex + 1}行: ${problem.actualColumns} 列 (期望 ${consistency.expectedColumns} 列)\n`
      })
    }

    return result
  }
}
