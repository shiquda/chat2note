import CryptoJS from 'crypto-js'

const TOKEN_STORAGE_KEY = 'chat2note_encrypted_token'
const JOPLIN_API_TOKEN_STORAGE = 'chat2note_encrypted_joplin_token'

/**
 * 生成或获取加密密钥
 * 使用扩展ID作为盐值，确保每个扩展实例有唯一的密钥
 */
function getEncryptionKey(): string {
  try {
    // 尝试从扩展manifest中获取ID作为盐值
    const extensionId =
      globalThis.chrome?.runtime?.id || globalThis.browser?.runtime?.id || 'chat2note'
    return `chat2note_secure_key_${extensionId}_2024`
  } catch {
    // 如果无法获取扩展ID，使用默认密钥
    return 'chat2note_secure_key_2024'
  }
}

export class CryptoUtils {
  /**
   * 加密文本
   */
  static encrypt(text: string): string {
    try {
      const key = getEncryptionKey()
      const encrypted = CryptoJS.AES.encrypt(text, key).toString()
      return encrypted
    } catch (err) {
      console.error('Encryption error:', err)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * 解密文本
   */
  static decrypt(encryptedText: string): string {
    try {
      const key = getEncryptionKey()
      const bytes = CryptoJS.AES.decrypt(encryptedText, key)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)

      if (!decrypted) {
        throw new Error('Failed to decrypt data - invalid format')
      }

      return decrypted
    } catch (err) {
      console.error('Decryption error:', err)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * 安全地存储API token (Notion)
   */
  static async storeApiToken(token: string): Promise<void> {
    if (!token) {
      throw new Error('Token cannot be empty')
    }

    const encrypted = this.encrypt(token)

    try {
      const storage = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome
      await storage.storage.local.set({
        [TOKEN_STORAGE_KEY]: encrypted,
      })
    } catch (error) {
      console.error('Error storing encrypted token:', error)
      throw new Error('Failed to store token securely')
    }
  }

  /**
   * 获取存储的API token (Notion)
   */
  static async getApiToken(): Promise<string | null> {
    try {
      const storage = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome
      const result = await storage.storage.local.get(TOKEN_STORAGE_KEY)
      const encrypted = result[TOKEN_STORAGE_KEY]

      if (!encrypted) {
        return null
      }

      return this.decrypt(encrypted)
    } catch (error) {
      console.error('Error retrieving API token:', error)
      return null
    }
  }

  /**
   * 清除存储的API token (Notion)
   */
  static async clearApiToken(): Promise<void> {
    try {
      const storage = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome
      await storage.storage.local.remove(TOKEN_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing API token:', error)
      throw new Error('Failed to clear token')
    }
  }

  /**
   * 安全地存储 Joplin API Token
   */
  static async storeJoplinApiToken(token: string): Promise<void> {
    if (!token) {
      throw new Error('Joplin API token cannot be empty')
    }

    const encrypted = this.encrypt(token)

    try {
      const storage = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome
      await storage.storage.local.set({
        [JOPLIN_API_TOKEN_STORAGE]: encrypted,
      })
    } catch (error) {
      console.error('Error storing encrypted Joplin API token:', error)
      throw new Error('Failed to store Joplin token securely')
    }
  }

  /**
   * 获取存储的 Joplin API Token
   */
  static async getJoplinApiToken(): Promise<string | null> {
    try {
      const storage = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome
      const result = await storage.storage.local.get(JOPLIN_API_TOKEN_STORAGE)
      const encrypted = result[JOPLIN_API_TOKEN_STORAGE]

      if (!encrypted) {
        return null
      }

      return this.decrypt(encrypted)
    } catch (error) {
      console.error('Error retrieving Joplin API token:', error)
      return null
    }
  }

  /**
   * 清除存储的 Joplin API Token
   */
  static async clearJoplinApiToken(): Promise<void> {
    try {
      const storage = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome
      await storage.storage.local.remove(JOPLIN_API_TOKEN_STORAGE)
    } catch (error) {
      console.error('Error clearing Joplin API token:', error)
      throw new Error('Failed to clear Joplin token')
    }
  }

  /**
   * 验证token格式
   */
  static validateTokenFormat(token: string): boolean {
    return token.length > 10
  }

  /**
   * 生成安全的随机字符串
   */
  static generateSecureRandom(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return result
  }
}
