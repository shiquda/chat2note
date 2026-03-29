import { describe, it, expect } from 'vitest'
import { CryptoUtils } from '../../src/utils/crypto'

describe('Crypto Utils', () => {
  describe('validateTokenFormat', () => {
    it('should return true for tokens longer than 10 characters', () => {
      expect(CryptoUtils.validateTokenFormat('longer-than-10-chars')).toBe(true)
      expect(CryptoUtils.validateTokenFormat('very-long-token-with-many-characters')).toBe(true)
    })

    it('should return false for tokens 10 characters or shorter', () => {
      expect(CryptoUtils.validateTokenFormat('short')).toBe(false)
      expect(CryptoUtils.validateTokenFormat('exact10')).toBe(false)
      expect(CryptoUtils.validateTokenFormat('')).toBe(false)
    })
  })

  describe('generateSecureRandom', () => {
    it('should generate a random string of specified length', () => {
      const result = CryptoUtils.generateSecureRandom(20)
      expect(result).toHaveLength(20)
      expect(typeof result).toBe('string')
    })

    it('should generate default length string when no length specified', () => {
      const result = CryptoUtils.generateSecureRandom()
      expect(result).toHaveLength(32)
    })

    it('should generate different strings on multiple calls', () => {
      const result1 = CryptoUtils.generateSecureRandom(10)
      const result2 = CryptoUtils.generateSecureRandom(10)
      const result3 = CryptoUtils.generateSecureRandom(10)

      // Very high probability that three random strings are different
      expect(result1 !== result2 || result2 !== result3).toBe(true)
    })

    it('should only contain allowed characters', () => {
      const result = CryptoUtils.generateSecureRandom(100)
      const allowedPattern = /^[A-Za-z0-9]+$/
      expect(result).toMatch(allowedPattern)
    })

    it('should handle zero length', () => {
      const result = CryptoUtils.generateSecureRandom(0)
      expect(result).toHaveLength(0)
    })

    it('should handle custom length parameter', () => {
      const result = CryptoUtils.generateSecureRandom(15)
      expect(result).toHaveLength(15)
    })
  })
})
