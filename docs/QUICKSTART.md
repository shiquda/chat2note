# 快速启动指南

## 🎯 立即开始

### 1. 启动开发服务器

```bash
cd docs
pnpm dev
```

访问 http://localhost:4321（如果端口被占用会自动使用下一个可用端口）

### 2. 构建生产版本

```bash
cd docs
pnpm build
```

构建结果在 `docs/dist/` 目录

### 3. 预览生产版本

```bash
cd docs
pnpm preview
```

## 🎨 自定义内容

### 修改首页

编辑 `docs/src/content/docs/index.mdx`

### 添加新文档

1. 英文文档：`docs/src/content/docs/{category}/{page}.md`
2. 中文文档：`docs/src/content/docs/zh-cn/{category}/{page}.md`

### 修改主题颜色

编辑 `docs/src/styles/custom.css`

## 🚀 部署到 Cloudflare Pages

详见 `docs/DEPLOYMENT.md`

### 快速步骤

1. 推送代码到 GitHub
2. 连接 Cloudflare Pages
3. 设置构建配置：
   - **Build command**: `pnpm build`
   - **Build output**: `dist`
   - **Root directory**: `docs`
4. 部署完成！

## 📚 文档结构

```
docs/src/content/docs/
├── index.mdx                    # 首页
├── getting-started/             # 快速开始（英文）
│   ├── introduction.md
│   ├── installation.md
│   ├── quick-start.md
│   └── supported-platforms.md
└── zh-cn/                       # 中文文档
    └── getting-started/
        ├── introduction.md
        └── installation.md
```

## 💡 提示

- **自动侧边栏**：使用 `autogenerate` 配置，文档会自动出现在侧边栏
- **多语言**：在 URL 中使用 `/zh-cn/` 前缀访问中文版本
- **搜索**：Starlight 自动集成 Pagefind 搜索
- **暗色主题**：自动支持，用户可切换

## 🔍 常用命令

```bash
# 开发
pnpm dev          # 启动开发服务器

# 构建
pnpm build        # 快速构建（推荐）
pnpm build:check  # 带 TypeScript 类型检查的构建

# 预览
pnpm preview      # 预览生产构建

# 类型检查
pnpm astro check  # 单独运行类型检查
```

## 📖 更多信息

- **项目总结**: `docs/PROJECT_SUMMARY.md`
- **部署指南**: `docs/DEPLOYMENT.md`
- **开发文档**: `docs/README.md`
