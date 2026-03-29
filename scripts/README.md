# i18n Scripts

本目录包含用于管理多语言翻译的脚本工具。

## 脚本说明

### `check-i18n.ts`

检查翻译完整性的脚本。

**功能：**

- 扫描代码库中所有使用的 i18n 键
- 验证所有使用的键在英文语言包中都存在
- 检查所有语言包是否覆盖了英文语言包中的所有键
- 检测未使用的翻译键

**使用方法：**

```bash
pnpm i18n:check
```

**输出示例：**

- ✅ 所有使用的键都存在于英文语言包
- ⚠️ 未使用的键列表
- ❌ 缺失的翻译键
- 📊 统计摘要

### `translate-i18n.ts`

AI 辅助批量翻译脚本。

**功能：**

- 加载英文语言包作为翻译源
- 生成适用于 AI 模型的翻译提示词
- 创建翻译骨架文件
- 保留占位符（如 `$TARGET$`, `{{title}}` 等）

**使用方法：**

```bash
# 翻译单个语言
pnpm i18n:translate fr

# 翻译所有语言
pnpm i18n:translate all

# 查看帮助
pnpm i18n:translate
```

**支持的语言：**

- `zh_CN` - 简体中文
- `fr` - 法语

**工作流程：**

1. 运行脚本生成翻译提示词
2. 将提示词复制到 Claude/ChatGPT
3. 获取 JSON 格式的翻译结果
4. 保存到对应的 `public/_locales/{locale}/messages.json`
5. 运行 `pnpm i18n:check` 验证

## 添加新语言

### 1. 在 `translate-i18n.ts` 中添加语言配置

```typescript
const LANGUAGES = {
  // ... 现有语言
  de: {
    name: 'German',
    nativeName: 'Deutsch',
  },
}
```

### 2. 运行翻译脚本

```bash
pnpm i18n:translate de
```

### 3. 使用 AI 进行翻译

将脚本输出的提示词提供给 AI，获取翻译 JSON。

### 4. 保存翻译文件

创建 `public/_locales/de/messages.json` 并粘贴翻译结果。

### 5. 验证

```bash
pnpm i18n:check
```

### 6. 在代码中注册新语言

在 `src/i18n/language-manager.ts` 和相关 UI 配置文件中添加新语言选项。

## 翻译指南

### 必须保留的内容

1. **占位符**：`$TARGET$`, `$FORMAT$`, `$ERROR$` 等
2. **模板变量**：`{{title}}`, `{{date}}`, `{{time}}`, `{{timestamp}}`
3. **技术术语**：Notion, Markdown, JSON, API 等
4. **转义字符**：`\n` (换行符)
5. **JSON 结构**：所有键名和 placeholders 配置

### 只翻译的内容

- `message` 字段的值
- `description` 字段保持英文（供开发者参考）

### 示例

**英文原文：**

```json
{
  "notification_export_success": {
    "message": "Exported to $TARGET$ ($FORMAT$)",
    "description": "Success notification for export",
    "placeholders": {
      "target": {
        "content": "$1",
        "example": "Local file"
      }
    }
  }
}
```

**法语翻译：**

```json
{
  "notification_export_success": {
    "message": "Exporté vers $TARGET$ ($FORMAT$)",
    "description": "Success notification for export",
    "placeholders": {
      "target": {
        "content": "$1",
        "example": "Local file"
      }
    }
  }
}
```

## 最佳实践

1. **定期检查**：每次添加新的翻译键后运行 `pnpm i18n:check`
2. **统一命名**：使用 `t()` 而不是 `translate()` 调用翻译函数
3. **语义化键名**：使用描述性的键名，如 `notification_export_success` 而不是 `msg1`
4. **批量添加**：一次性添加多个相关键，然后统一翻译
5. **测试验证**：在实际界面中验证翻译的准确性和流畅性

## 故障排除

### 检查脚本报告缺失键

1. 检查代码中是否使用了未定义的键
2. 在 `public/_locales/en/messages.json` 中添加缺失的键
3. 使用翻译脚本更新其他语言

### 翻译脚本无法识别新语言

1. 确认在 `LANGUAGES` 配置中添加了新语言
2. 检查语言代码是否正确（如 `zh_CN`, `en`, `fr`）

### AI 翻译结果格式不正确

1. 确保向 AI 提供了完整的提示词
2. 要求 AI 只返回 JSON，不要添加额外说明
3. 验证 JSON 格式的有效性

## 技术细节

### 键检测正则表达式

脚本使用以下正则表达式检测代码中的翻译键：

```typescript
;/\b(?:t|translate)\s*\(\s*['"`]([^'"`]+)['"`]/g
```

这会匹配：

- `t('key')`
- `t("key")`
- `translate('key')`
- `translate("key")`

### 文件扫描范围

- `src/**/*.{ts,tsx,js,jsx}`
- `entrypoints/**/*.{ts,tsx,js,jsx}`

### 语言包位置

- `public/_locales/{locale}/messages.json`

### Web Extensions i18n API

项目使用标准的 Web Extensions i18n API，兼容 Chrome 和 Firefox：

- [Chrome i18n API](https://developer.chrome.com/docs/extensions/reference/i18n/)
- [Firefox i18n API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n)
