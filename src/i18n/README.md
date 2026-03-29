# i18n Internationalization System

Chat2Note 使用基于 Web Extensions 标准的 i18n 系统,完全兼容 Chrome 和 Firefox。

## 架构概述

```
_locales/              # 语言包目录(Web Extensions 标准)
├── en/               # 英文
│   └── messages.json
├── zh_CN/            # 简体中文
│   └── messages.json
└── zh_TW/            # 繁体中文(可选)
    └── messages.json

src/i18n/
├── index.ts          # 核心 i18n 模块
├── types.ts          # TypeScript 类型定义
└── react.tsx         # React hooks 集成
```

## 使用方法

### 1. 在 React 组件中使用

```tsx
import { useTranslation } from '../../src/i18n/react'

function MyComponent() {
  const t = useTranslation()

  return (
    <div>
      <h1>{t('app_name')}</h1>
      <p>{t('app_subtitle')}</p>
    </div>
  )
}
```

### 2. 在非 React 代码中使用

```typescript
import t from '../src/i18n'

// 简单文本
const title = t('app_name')

// 带占位符的文本
const message = t('notification_export_success', ['本地文件', 'Markdown'])
```

### 3. 使用 Trans 组件

```tsx
import { Trans } from '../../src/i18n/react'

function MyComponent() {
  return <Trans id="welcome_message" values={{ name: 'John' }} />
}
```

## 添加新的翻译键

### 1. 在 `_locales/en/messages.json` 添加英文翻译:

```json
{
  "my_new_key": {
    "message": "Hello, world!",
    "description": "Greeting message"
  }
}
```

### 2. 在 `_locales/zh_CN/messages.json` 添加中文翻译:

```json
{
  "my_new_key": {
    "message": "你好,世界!",
    "description": "问候消息"
  }
}
```

### 3. 在代码中使用:

```tsx
const greeting = t('my_new_key')
```

## 带占位符的翻译

### 定义翻译:

```json
{
  "notification_export_success": {
    "message": "Exported to $TARGET$ ($FORMAT$)",
    "description": "Success notification for export",
    "placeholders": {
      "target": {
        "content": "$1",
        "example": "Local file"
      },
      "format": {
        "content": "$2",
        "example": "Markdown"
      }
    }
  }
}
```

### 使用:

```typescript
const message = t('notification_export_success', ['本地文件', 'Markdown'])
// 结果: "Exported to 本地文件 (Markdown)"
```

## 动态文本(使用 Getter)

对于需要动态获取翻译的常量,使用 getter 模式:

```typescript
export const EXPORT_TARGETS = [
  {
    type: 'local',
    get label() {
      return t('target_local')
    }, // 每次访问时动态获取翻译
    icon: FileDown,
  },
]
```

## API 参考

### `t(key, substitutions?)`

主要翻译函数。

- `key`: 翻译键
- `substitutions`: 可选的占位符值(数组或对象)

### `getCurrentLocale()`

获取当前语言代码(如 'en', 'zh-CN')。

### `getBaseLanguage()`

获取基础语言代码(如 'en', 'zh')。

### `isChineseLocale()`

判断当前是否为中文环境。

### `isEnglishLocale()`

判断当前是否为英文环境。

### `useTranslation()`

React hook,返回翻译函数。

### `useLocale()`

React hook,返回当前语言代码。

## 浏览器兼容性

- ✅ Chrome (Manifest V3)
- ✅ Firefox (Manifest V2/V3)
- ✅ Edge (Chromium)
- ✅ 其他基于 Chromium 的浏览器

## 语言检测

扩展自动使用浏览器的语言设置:

1. 浏览器语言为中文 → 显示中文
2. 浏览器语言为英文 → 显示英文
3. 其他语言 → 回退到默认语言(英文)

## 最佳实践

1. **使用描述性键名**: `button_export` 而不是 `btn1`
2. **添加 description**: 帮助翻译者理解上下文
3. **避免硬编码文本**: 所有用户可见的文本都应该通过 i18n
4. **使用占位符**: 对于包含动态内容的文本
5. **测试所有语言**: 确保在不同语言下UI正常显示

## 调试技巧

### 查看当前语言

```typescript
import { getCurrentLocale } from '../src/i18n'

console.log('Current locale:', getCurrentLocale())
```

### 检查缺失的翻译

如果翻译键不存在,`t()` 函数会:

1. 返回原始键名
2. 在控制台输出警告

```
[i18n] Missing translation for key: my_missing_key
```

## 文件结构说明

### `_locales/*/messages.json`

标准的 Web Extensions 翻译文件格式:

```json
{
  "key_name": {
    "message": "Translated text",
    "description": "Optional description for translators"
  }
}
```

### `src/i18n/index.ts`

核心 i18n 模块,提供:

- 跨浏览器兼容的 API 封装
- 翻译函数
- 语言检测工具

### `src/i18n/react.tsx`

React 集成,提供:

- `useTranslation` hook
- `useLocale` hook
- `Trans` 组件
- `withTranslation` HOC

### `src/i18n/types.ts`

TypeScript 类型定义,提供完整的类型安全。
