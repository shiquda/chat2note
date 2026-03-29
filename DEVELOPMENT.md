# 开发环境数据持久化配置说明

## 问题背景

在之前的开发流程中，使用 `pnpm dev` 时每次启动都会：

- 丢失ChatGPT网站的登录状态
- 丢失扩展的配置（Notion API、导出设置等）
- 丢失所有扩展相关的本地存储数据

## 解决方案

### 1. 配置数据持久化

通过修改 `wxt.config.ts` 文件，添加了以下配置：

```typescript
webExt: {
  chromiumProfile: resolve(".wxt/chrome-data"),
  keepProfileChanges: true,
}
```

### 2. 新的开发命令

在 `package.json` 中添加了新的开发命令：

```bash
# 带数据持久化的Chrome开发模式
pnpm dev:persist

# 带数据持久化的Firefox开发模式
pnpm dev:firefox:persist
```

### 3. 数据存储位置

Chrome用户数据现在存储在：

- 项目目录：`.wxt/chrome-data/`
- 包含完整的浏览器配置文件、扩展数据、登录状态等

### 4. .gitignore 配置

已更新 `.gitignore` 文件，确保浏览器数据不会被提交到版本控制：

```
.wxt/chrome-data/
.wxt/firefox-profile/
```

## 使用方法

### 日常开发

```bash
# 使用带持久化的开发模式（推荐）
pnpm dev:persist

# Firefox开发
pnpm dev:firefox:persist
```

### 清理数据（如需重置）

```bash
# 删除Chrome数据目录
rm -rf .wxt/chrome-data/

# 删除Firefox数据目录（如果有）
rm -rf .wxt/firefox-profile/
```

## 注意事项

1. **首次使用**：第一次使用 `pnpm dev:persist` 时，需要重新登录ChatGPT并配置扩展
2. **数据隔离**：开发环境的浏览器数据与日常使用的浏览器是独立的
3. **团队协作**：每个开发者都会有自己的 `.wxt/chrome-data` 目录，不会相互影响
4. **性能考虑**：数据持久化可能会稍微增加启动时间，但显著提升了开发体验

## 预期效果

- ✅ ChatGPT登录状态保持
- ✅ 扩展配置持久化保存
- ✅ 无需重复配置Notion API等设置
- ✅ 开发效率显著提升
