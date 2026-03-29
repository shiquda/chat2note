/// <reference types="vitest" />

/**
 * 测试环境的类型定义
 */

// 解决测试环境中的全局类型问题
declare global {
  namespace Viestest {
    interface Environment {
      happyDOM: unknown
    }
  }
}

export {}
