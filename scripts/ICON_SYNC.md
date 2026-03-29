# 图标同步系统

这个脚本系统确保悬浮窗和设置页面使用完全一致的 Tabler Icons。

## 使用方法

### 提取图标路径

```bash
pnpm extract-icons
```

这个命令会：

1. 从 `@tabler/icons` 的原始 SVG 文件中提取路径
2. 自动生成悬浮窗的图标代码
3. 确保与设置页面的 React 组件图标完全一致

## 工作原理

### 悬浮端 vs 设置端

**设置页面**（React + JSX）：

```tsx
import { IconBook } from '@tabler/icons-react'
icon: IconBook
```

**悬浮窗**（原生 DOM）：

```typescript
// 由脚本自动生成
const paths = {
  siyuan: [
    { d: 'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0' },
    // ... 从 Tabler Icons SVG 文件提取的真实路径
  ],
}
```

### 图标提取流程

1. **查找 SVG 文件**：在 `node_modules/@tabler/icons/icons/` 中查找对应 SVG
2. **解析 SVG 内容**：提取所有 path 元素的 d 属性
3. **过滤无用路径**：移除背景矩形等不需要的路径
4. **生成代码**：自动更新 `src/content-scripts/utils/icons.ts`

## 添加新图标

如果需要添加新的导出目标图标：

### 1. 更新图标映射

在 `scripts/extract-svg-files.js` 中：

```javascript
const ICONS_TO_SYNC = {
  // 现有图标...
  newTarget: 'icon-name', // 添加新映射
}
```

### 2. 更新设置页面

在 `src/config/ui-constants.ts` 中：

```tsx
import { IconNewIcon } from '@tabler/icons-react'

{
  type: 'newTarget',
  get label() { return t('target_new_target') },
  icon: IconNewIcon,
}
```

### 3. 运行同步

```bash
pnpm extract-icons
```

## 未来开发新图标的工作流程

当你需要新的图标时：

1. **查找图标**：在 [Tabler Icons 官网](https://tabler-icons.io/) 找到合适的图标
2. **更新设置页面**：在 `ui-constants.ts` 中导入并使用新的 React 图标组件
3. **更新同步映射**：在 `extract-svg-files.js` 中添加图标名称映射
4. **运行同步脚本**：`pnpm extract-icons`
5. **测试验证**：运行 `pnpm typecheck` 和 `pnpm build`

## 故障排除

### 找不到 SVG 文件

```bash
# 确保 @tabler/icons 已安装
pnpm add -D @tabler/icons

# 重新运行提取
pnpm extract-icons
```

### 图标不显示

1. 检查 TypeScript 类型：`pnpm typecheck`
2. 检查构建：`pnpm build`
3. 在浏览器开发者工具中检查 SVG 元素

### 提取路径不正确

查看脚本输出的路径，确保：

- 路径长度合理（不是空的或太短的）
- 路径格式正确（以 M 开头，包含 Z 或不包含）

## 优势

✅ **完全一致性**：直接使用 Tabler Icons 的原始路径
✅ **自动更新**：Tabler Icons 更新后，重新运行脚本即可
✅ **类型安全**：TypeScript 确保所有图标类型正确
✅ **维护简单**：只需维护一个映射关系文件
✅ **性能优秀**：悬浮端不需要加载 React，轻量级

## 技术细节

- **SVG 路径提取**：使用正则表达式解析 SVG 文件
- **路径过滤**：自动移除背景矩形 (M0 0h24v24H0z)
- **属性提取**：支持 stroke-linecap、stroke-linejoin 等属性
- **错误处理**：提供详细错误信息和解决方案
