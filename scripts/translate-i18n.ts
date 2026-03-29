#!/usr/bin/env node
/**
 * i18n Translation Script
 *
 * This script uses AI to translate English locale to other languages.
 * It ensures all keys from English are translated while preserving:
 * - JSON structure
 * - Placeholders ($1$, $TARGET$, etc.)
 * - Description fields
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import cliProgress from 'cli-progress'

// Load environment variables
config()

// Paths
const LOCALES_DIR = join(process.cwd(), 'public', '_locales')
const EN_MESSAGES_PATH = join(LOCALES_DIR, 'en', 'messages.json')

// Language configurations
const LANGUAGES = {
  zh_CN: {
    name: 'Simplified Chinese',
    nativeName: '简体中文',
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
  },
  de: {
    name: 'German',
    nativeName: 'Deutsch',
  },
  es: {
    name: 'Spanish',
    nativeName: 'Español',
  },
  pt: {
    name: 'Portuguese',
    nativeName: 'Português',
  },
  ja: {
    name: 'Japanese',
    nativeName: '日本語',
  },
  ko: {
    name: 'Korean',
    nativeName: '한국어',
  },
  // Add more languages here
}

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

interface MessageEntry {
  message: string
  description?: string
  placeholders?: Record<string, unknown>
}

interface Messages {
  [key: string]: MessageEntry
}

/**
 * Load English messages
 */
function loadEnglishMessages(): Messages {
  try {
    const content = readFileSync(EN_MESSAGES_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    console.error(`${colors.red}❌ Error loading English messages:${colors.reset}`)
    process.exit(1)
  }
}

/**
 * Load existing messages for a locale
 */
function loadExistingMessages(locale: string): Messages | null {
  try {
    const messagesPath = join(LOCALES_DIR, locale, 'messages.json')
    const content = readFileSync(messagesPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Save messages to a locale
 */
function saveMessages(locale: string, messages: Messages) {
  const localePath = join(LOCALES_DIR, locale)
  const messagesPath = join(localePath, 'messages.json')

  // Create directory if it doesn't exist
  if (!existsSync(localePath)) {
    mkdirSync(localePath, { recursive: true })
  }

  // Write with proper formatting
  writeFileSync(messagesPath, JSON.stringify(messages, null, 2) + '\n', 'utf-8')
}

/**
 * Generate translation prompt for AI (single key)
 */
function generateSingleKeyPrompt(key: string, entry: MessageEntry, languageName: string): string {
  return `Translate the following i18n message from English to ${languageName}.

IMPORTANT INSTRUCTIONS:
1. Translate ONLY the "message" field value
2. Keep the "description" field in English (it's for developers)
3. Preserve ALL placeholders exactly as they are (e.g., $TARGET$, $FORMAT$, $1$, $2$, {{title}}, {{date}}, etc.)
4. Maintain the exact JSON structure
5. Keep all special characters, newlines (\\n), and escape sequences
6. For technical terms (Notion, Markdown, JSON, API, etc.), keep them as-is
7. Ensure natural and idiomatic translations

Input:
${JSON.stringify({ [key]: entry }, null, 2)}

Please respond with ONLY the translated JSON object (just the single key-value pair), no additional text or explanation.`
}

/**
 * Call AI API to translate a single key
 */
async function translateSingleKey(
  key: string,
  entry: MessageEntry,
  targetLanguage: string,
  languageName: string
): Promise<MessageEntry | null> {
  const prompt = generateSingleKeyPrompt(key, entry, languageName)

  // Get API configuration from environment variables
  const apiKey = process.env.OPENAI_API_KEY
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    console.error(`${colors.red}❌ Error: OPENAI_API_KEY not found in .env file${colors.reset}`)
    console.log(`${colors.yellow}Please create a .env file with:${colors.reset}`)
    console.log(`  OPENAI_API_KEY=your-api-key`)
    console.log(`  OPENAI_BASE_URL=https://api.openai.com/v1 (optional)`)
    console.log(`  OPENAI_MODEL=gpt-4o-mini (optional)`)
    process.exit(1)
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API request failed: ${response.status} ${error}`)
  }

  const data = await response.json()
  const translatedText = data.choices?.[0]?.message?.content

  if (!translatedText) {
    throw new Error('No translation received from API')
  }

  // Extract JSON from response
  let jsonText = translatedText.trim()

  // Try to find JSON in markdown code blocks
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  // Try to find JSON object boundaries
  const jsonStart = jsonText.indexOf('{')
  const jsonEnd = jsonText.lastIndexOf('}')

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
    jsonText = jsonText.substring(jsonStart, jsonEnd + 1)
  }

  // Parse the translated JSON
  const translated = JSON.parse(jsonText)
  return translated[key] || null
}

/**
 * Translate to a specific language
 */
async function translateToLanguage(
  locale: string,
  languageName: string,
  progressBar?: cliProgress.SingleBar
) {
  const useOwnProgress = !progressBar
  const bar =
    progressBar ||
    new cliProgress.SingleBar({
      format: `${colors.cyan}{bar}${colors.reset} {percentage}% | {stage}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    })

  if (useOwnProgress) {
    console.log(
      `\n${colors.cyan}${colors.bold}Translating to ${languageName} (${locale})...${colors.reset}`
    )
    bar.start(100, 0, { stage: 'Loading English messages...' })
  }

  // Load English messages
  const enMessages = loadEnglishMessages()
  const enEntries = Object.entries(enMessages)
  if (useOwnProgress) bar.update(10, { stage: 'Loading existing translations...' })

  // Load existing translations (if any)
  const existingMessages = loadExistingMessages(locale)

  // Determine which keys need translation
  const keysToTranslate = enEntries.filter(([key]) => {
    if (!existingMessages) return true
    return !existingMessages[key] || existingMessages[key].message.startsWith('[TO_TRANSLATE]')
  })

  if (keysToTranslate.length === 0) {
    if (useOwnProgress) {
      bar.update(100, { stage: 'Complete - all keys already translated' })
      bar.stop()
    }
    console.log(`${colors.green}✅ All keys already translated for ${locale}${colors.reset}`)
    return
  }

  if (useOwnProgress) {
    bar.update(15, {
      stage: `Translating ${keysToTranslate.length}/${enEntries.length} keys...`,
    })
  }

  console.log(
    `${colors.blue}📝 Keys to translate: ${keysToTranslate.length}/${enEntries.length}${colors.reset}`
  )

  // Translate keys with concurrency control
  const translated: Messages = {}
  const totalKeys = keysToTranslate.length
  let successCount = 0
  let failCount = 0
  const MAX_CONCURRENT = 10

  // Process keys in batches with concurrency limit
  const translateKey = async (key: string, entry: MessageEntry, index: number): Promise<void> => {
    const progress = 15 + Math.floor((index / totalKeys) * 65) // 15% to 80%

    if (useOwnProgress) {
      const shortKey = key.length > 30 ? key.substring(0, 27) + '...' : key
      bar.update(progress, { stage: `[${index + 1}/${totalKeys}] ${shortKey}` })
    }

    try {
      const result = await translateSingleKey(key, entry, locale, languageName)
      if (result) {
        translated[key] = result
        successCount++
      } else {
        console.warn(`${colors.yellow}⚠️  No translation returned for key: ${key}${colors.reset}`)
        translated[key] = {
          message: `[TO_TRANSLATE] ${entry.message}`,
          description: entry.description,
          ...(entry.placeholders && { placeholders: entry.placeholders }),
        }
        failCount++
      }
    } catch (error) {
      console.error(`${colors.red}❌ Failed to translate key: ${key}${colors.reset}`)
      if (error instanceof Error) {
        console.error(`   ${error.message}`)
      }
      // Keep original with TO_TRANSLATE marker
      translated[key] = {
        message: `[TO_TRANSLATE] ${entry.message}`,
        description: entry.description,
        ...(entry.placeholders && { placeholders: entry.placeholders }),
      }
      failCount++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // Process in batches to control concurrency
  for (let i = 0; i < totalKeys; i += MAX_CONCURRENT) {
    const batch = keysToTranslate.slice(i, i + MAX_CONCURRENT)
    await Promise.all(
      batch.map(([key, entry], batchIndex) => translateKey(key, entry, i + batchIndex))
    )
  }

  if (useOwnProgress) bar.update(80, { stage: 'Merging translations...' })

  // Merge with existing translations
  const finalMessages: Messages = {
    ...(existingMessages || {}),
    ...translated,
  }

  // Ensure all keys from English are present
  for (const [key, entry] of enEntries) {
    if (!finalMessages[key]) {
      finalMessages[key] = {
        message: `[TO_TRANSLATE] ${entry.message}`,
        description: entry.description,
        ...(entry.placeholders && { placeholders: entry.placeholders }),
      }
    }
  }

  if (useOwnProgress) bar.update(90, { stage: 'Saving translation...' })

  // Save
  saveMessages(locale, finalMessages)

  if (useOwnProgress) {
    bar.update(100, { stage: 'Complete!' })
    bar.stop()
  }

  console.log(
    `${colors.green}✅ Translation complete: ${successCount} succeeded, ${failCount} failed${colors.reset}`
  )
  console.log(`${colors.green}   Saved to ${locale}/messages.json${colors.reset}`)
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  console.log(`${colors.bold}${colors.cyan}🌍 i18n Translation Script${colors.reset}\n`)

  if (args.length === 0) {
    console.log(`${colors.yellow}Usage:${colors.reset}`)
    console.log(`  pnpm i18n:translate <locale>`)
    console.log(`  pnpm i18n:translate all`)
    console.log()
    console.log(`${colors.yellow}Available locales:${colors.reset}`)
    for (const [locale, { name, nativeName }] of Object.entries(LANGUAGES)) {
      console.log(`  ${locale} - ${name} (${nativeName})`)
    }
    console.log()
    process.exit(0)
  }

  const targetLocale = args[0]

  if (targetLocale === 'all') {
    // Translate all languages with multi-progress bar
    const multibar = new cliProgress.MultiBar(
      {
        format: `${colors.cyan}{bar}${colors.reset} {percentage}% | {locale}: {stage}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        clearOnComplete: false,
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic
    )

    const locales = Object.entries(LANGUAGES)
    const bars: Map<string, cliProgress.SingleBar> = new Map()

    // Create a progress bar for each language
    for (const [locale, { name }] of locales) {
      const bar = multibar.create(100, 0, { locale, stage: 'Waiting...', name })
      bars.set(locale, bar)
    }

    // Translate sequentially with progress bars
    for (const [locale, { name }] of locales) {
      const bar = bars.get(locale)!
      bar.update(0, { stage: 'Starting...' })
      await translateToLanguage(locale, name, bar)
    }

    multibar.stop()
    console.log(`\n${colors.green}${colors.bold}✅ All translations complete${colors.reset}`)
  } else if (LANGUAGES[targetLocale as keyof typeof LANGUAGES]) {
    // Translate specific language
    const { name } = LANGUAGES[targetLocale as keyof typeof LANGUAGES]
    await translateToLanguage(targetLocale, name)
  } else {
    console.error(`${colors.red}❌ Unknown locale: ${targetLocale}${colors.reset}`)
    console.log(
      `${colors.yellow}Available locales:${colors.reset} ${Object.keys(LANGUAGES).join(', ')}`
    )
    process.exit(1)
  }

  console.log(`\n${colors.green}${colors.bold}✅ Translation process complete${colors.reset}`)
  console.log(`${colors.yellow}Next steps:${colors.reset}`)
  console.log(`1. Review the translated files in public/_locales/`)
  console.log(`2. Run 'pnpm i18n:check' to verify`)
}

main()
