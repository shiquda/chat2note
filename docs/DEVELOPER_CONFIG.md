# 开发者配置指南 - 后端API端点

## 概述

后端API端点（FOSSBilling服务器地址）由开发者在构建时配置，**不暴露给最终用户**。

## 配置方法

### 方法1：使用环境变量（推荐）

1. 在项目根目录创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env
```

2. 编辑 `.env` 文件，设置你的FOSSBilling服务器地址：

```env
VITE_MEMBERSHIP_API_URL=https://your-fossbilling-server.com
VITE_MEMBERSHIP_REGISTER_URL=https://your-fossbilling-server.com/order/service/title/chat2note
```

3. 启动开发服务器或构建：

```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build
```

### 方法2：直接修改配置文件

编辑 `src/config/membership-api.ts`：

```typescript
export const MEMBERSHIP_API_CONFIG = {
  // 修改这里为你的FOSSBilling服务器地址
  apiUrl: import.meta.env.VITE_MEMBERSHIP_API_URL || 'https://billing.example.com',

  // 修改注册页面URL
  registerUrl:
    import.meta.env.VITE_MEMBERSHIP_REGISTER_URL ||
    'https://billing.example.com/order/service/title/chat2note',

  apiVersion: 'v1',
  timeout: 30000,
  debug: import.meta.env.DEV || false,
} as const
```

## 不同环境的配置

### 开发环境

创建 `.env.development`：

```env
VITE_MEMBERSHIP_API_URL=https://dev-billing.example.com
VITE_MEMBERSHIP_REGISTER_URL=https://dev-billing.example.com/order/service/title/chat2note
```

### 生产环境

创建 `.env.production`：

```env
VITE_MEMBERSHIP_API_URL=https://billing.example.com
VITE_MEMBERSHIP_REGISTER_URL=https://billing.example.com/order/service/title/chat2note
```

### 测试环境

创建 `.env.test`：

```env
VITE_MEMBERSHIP_API_URL=https://test-billing.example.com
VITE_MEMBERSHIP_REGISTER_URL=https://test-billing.example.com/order/service/title/chat2note
```

## CI/CD 配置示例

### GitHub Actions

```yaml
- name: Build Extension
  env:
    VITE_MEMBERSHIP_API_URL: ${{ secrets.MEMBERSHIP_API_URL }}
    VITE_MEMBERSHIP_REGISTER_URL: ${{ secrets.MEMBERSHIP_REGISTER_URL }}
  run: pnpm build
```

### GitLab CI

```yaml
build:
  script:
    - export VITE_MEMBERSHIP_API_URL=$MEMBERSHIP_API_URL
    - export VITE_MEMBERSHIP_REGISTER_URL=$MEMBERSHIP_REGISTER_URL
    - pnpm build
```

## 验证配置

启动开发服务器后，打开浏览器控制台，检查网络请求是否指向正确的API端点。

## 安全注意事项

- ✅ `.env` 文件已被添加到 `.gitignore`，不会被提交到版本控制
- ✅ API端点在构建时被编译到代码中，用户无法修改
- ✅ 敏感信息（如API密钥）应通过环境变量管理，不要硬编码

## 用户看到的界面

用户在扩展的Options页面只会看到：

- API Key 输入框
- 注册账户按钮（引导用户前往注册页面）
- 测试连接按钮
- 会员状态显示

**用户不会看到**：后端服务器地址、API配置等技术细节。

## 用户如何获取 API Key

用户需要：

1. 登录 FOSSBilling 客户端面板
2. 进入个人资料页面
3. 复制 API Key
4. 在 Chat2Note 扩展中粘贴

详细步骤请参考：[如何获取 API Key](./GET_API_KEY.md)
