import process from 'node:process'
import { existsSync, readFileSync } from 'node:fs'
import { createNitro } from 'nitropack'
import type { NitroOptions } from 'nitropack'
import { resolve } from 'pathe'
import * as dotenv from 'dotenv'
import type { TestContext, TestOptions } from './types'

let currentContext: TestContext | undefined

export async function createTestContext(options: Partial<TestOptions>): Promise<TestContext> {
  const { mode = 'development', rootDir = process.cwd() } = options
  const isDev = mode === 'development'
  const preset: NitroOptions['preset'] = isDev ? 'nitro-dev' : 'node'

  setupDotenv({ rootDir })

  const ctx: TestContext = {
    options: {
      rootDir,
      mode,
    },
    isDev,
    preset,
    nitro: await createNitro({
      preset,
      dev: isDev,
      rootDir,
      serveStatic: !isDev,
      timing: true,
      replace: {
        'import.meta.test': JSON.stringify(true),
      },
    }),
  }

  return provideTextContext(ctx)
}

export function provideTestContext(): TestContext {
  if (!currentContext) {
    throw new Error('No Nitro context available. Did you forget to call "setup"?')
  }

  return currentContext
}

export function provideTextContext(context: TestContext): TestContext
export function provideTextContext(context?: TestContext): TestContext | undefined
export function provideTextContext(context?: TestContext): TestContext | undefined {
  currentContext = context
  return context
}

export function setupDotenv({
  rootDir = process.cwd(),
  fileName = '.env.test',
  override = true,
}: {
  rootDir?: string
  fileName?: string
  override?: boolean
} = {}) {
  const environment: Record<string, string> = Object.create(null)
  const dotenvFile = resolve(rootDir, fileName)

  if (existsSync(dotenvFile)) {
    const parsed = dotenv.parse(readFileSync(dotenvFile, 'utf8'))
    Object.assign(environment, parsed)
  }

  // Fill environment variables
  for (const key in environment) {
    if (override || process.env[key] === undefined)
      process.env[key] = environment[key]
  }

  return environment
}
