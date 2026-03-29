#!/usr/bin/env node
/**
 * i18n Key Checker
 *
 * This script scans the codebase for i18n key usage and validates that:
 * 1. All used keys exist in the English locale (source of truth)
 * 2. All locales have translations for all keys defined in English
 * 3. No unused keys exist in translation files
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

// Paths
const LOCALES_DIR = join(process.cwd(), 'public', '_locales')
const SRC_DIR = join(process.cwd(), 'src')
const ENTRYPOINTS_DIR = join(process.cwd(), 'entrypoints')

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

interface Messages {
  [key: string]: {
    message: string
    description?: string
    placeholders?: Record<string, unknown>
  }
}

/**
 * Extract all i18n keys used in the codebase
 */
function extractUsedKeys(): Set<string> {
  const usedKeys = new Set<string>()

  // Patterns to match:
  // - t('key')
  // - t("key")
  // - t(`key`)
  // - translate('key')
  // - translate("key")
  // - translate(`key`)
  const tFunctionPattern = /\b(?:t|translate)\s*\(\s*['"`]([^'"`]+)['"`]/g

  function scanDirectory(dir: string) {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        scanDirectory(fullPath)
      } else if (stat.isFile()) {
        const ext = extname(fullPath)
        if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
          const content = readFileSync(fullPath, 'utf-8')

          // Find all t() calls
          let match
          while ((match = tFunctionPattern.exec(content)) !== null) {
            const key = match[1]

            // Handle special case: format_${format} -> expand to possible format keys
            if (key === 'format_${format}') {
              // Add the possible format keys based on the export format types
              usedKeys.add('format_markdown')
              usedKeys.add('format_json')
              usedKeys.add('format_txt')
            } else {
              usedKeys.add(key)
            }
          }
        }
      }
    }
  }

  // Scan source and entrypoints directories
  if (statSync(SRC_DIR).isDirectory()) {
    scanDirectory(SRC_DIR)
  }
  if (statSync(ENTRYPOINTS_DIR).isDirectory()) {
    scanDirectory(ENTRYPOINTS_DIR)
  }

  return usedKeys
}

/**
 * Load messages for a specific locale
 */
function loadMessages(locale: string): Messages | null {
  try {
    const messagesPath = join(LOCALES_DIR, locale, 'messages.json')
    const content = readFileSync(messagesPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Get all available locales
 */
function getAvailableLocales(): string[] {
  try {
    return readdirSync(LOCALES_DIR).filter(entry => {
      const stat = statSync(join(LOCALES_DIR, entry))
      return stat.isDirectory()
    })
  } catch {
    return []
  }
}

/**
 * Main validation function
 */
function checkI18n() {
  console.log(`${colors.bold}${colors.cyan}🔍 i18n Key Checker${colors.reset}\n`)

  // Step 1: Extract used keys
  console.log(`${colors.blue}📝 Scanning codebase for i18n key usage...${colors.reset}`)
  const usedKeys = extractUsedKeys()
  console.log(`   Found ${usedKeys.size} unique keys in code\n`)

  // Step 2: Load English messages (source of truth)
  console.log(`${colors.blue}📖 Loading English locale (source of truth)...${colors.reset}`)
  const enMessages = loadMessages('en')
  if (!enMessages) {
    console.error(`${colors.red}❌ Error: Could not load English locale${colors.reset}`)
    process.exit(1)
  }
  const enKeys = new Set(Object.keys(enMessages))
  console.log(`   Found ${enKeys.size} keys in English locale\n`)

  // Step 3: Check for missing translations in English
  console.log(`${colors.blue}🔎 Checking for missing keys in English locale...${colors.reset}`)
  const missingInEn = Array.from(usedKeys).filter(key => !enKeys.has(key))
  if (missingInEn.length > 0) {
    console.log(`${colors.red}❌ Missing in English locale (${missingInEn.length}):${colors.reset}`)
    missingInEn.forEach(key => console.log(`   - ${key}`))
    console.log()
  } else {
    console.log(`${colors.green}✅ All used keys exist in English locale${colors.reset}\n`)
  }

  // Step 4: Check for unused keys in English
  console.log(`${colors.blue}🔎 Checking for unused keys in English locale...${colors.reset}`)
  const unusedInEn = Array.from(enKeys).filter(key => !usedKeys.has(key))
  if (unusedInEn.length > 0) {
    console.log(
      `${colors.yellow}⚠️  Unused in English locale (${unusedInEn.length}):${colors.reset}`
    )
    unusedInEn.forEach(key => console.log(`   - ${key}`))
    console.log()
  } else {
    console.log(`${colors.green}✅ No unused keys in English locale${colors.reset}\n`)
  }

  // Step 5: Check all other locales
  console.log(`${colors.blue}🌍 Checking other locales...${colors.reset}`)
  const locales = getAvailableLocales().filter(l => l !== 'en')

  let hasErrors = false

  for (const locale of locales) {
    const messages = loadMessages(locale)
    if (!messages) {
      console.log(`${colors.red}❌ ${locale}: Could not load messages${colors.reset}`)
      hasErrors = true
      continue
    }

    const localeKeys = new Set(Object.keys(messages))

    // Check for missing keys
    const missing = Array.from(enKeys).filter(key => !localeKeys.has(key))

    // Check for extra keys
    const extra = Array.from(localeKeys).filter(key => !enKeys.has(key))

    if (missing.length === 0 && extra.length === 0) {
      console.log(
        `${colors.green}✅ ${locale}: Perfect match (${localeKeys.size} keys)${colors.reset}`
      )
    } else {
      hasErrors = true
      console.log(`${colors.yellow}⚠️  ${locale}:${colors.reset}`)

      if (missing.length > 0) {
        console.log(`   ${colors.red}Missing (${missing.length}):${colors.reset}`)
        missing.forEach(key => console.log(`   - ${key}`))
      }

      if (extra.length > 0) {
        console.log(`   ${colors.yellow}Extra (${extra.length}):${colors.reset}`)
        extra.forEach(key => console.log(`   - ${key}`))
      }
    }
  }

  console.log()

  // Final summary
  console.log(`${colors.bold}${colors.cyan}📊 Summary${colors.reset}`)
  console.log(`   Total keys used in code: ${usedKeys.size}`)
  console.log(`   Keys in English locale: ${enKeys.size}`)
  console.log(`   Locales checked: ${locales.length + 1}`)

  if (missingInEn.length > 0 || hasErrors) {
    console.log(`\n${colors.red}${colors.bold}❌ Validation failed${colors.reset}`)
    process.exit(1)
  } else if (unusedInEn.length > 0) {
    console.log(
      `\n${colors.yellow}${colors.bold}⚠️  Validation passed with warnings${colors.reset}`
    )
    process.exit(0)
  } else {
    console.log(`\n${colors.green}${colors.bold}✅ All checks passed${colors.reset}`)
    process.exit(0)
  }
}

// Run the checker
checkI18n()
