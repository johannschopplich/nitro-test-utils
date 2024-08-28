import process from 'node:process'
import { existsSync, readFileSync } from 'node:fs'
import { createNitro } from 'nitropack'
import type { NitroOptions } from 'nitropack'
import { join, resolve } from 'pathe'
import * as dotenv from 'dotenv'
import type { TestContext, TestOptions } from './types'

let currentContext: TestContext | undefined

export async function createTestContext(options: Partial<TestOptions>): Promise<TestContext> {
  const { mode = 'development', rootDir = process.cwd() } = options
  const isDev = mode === 'development'
  const preset: NitroOptions['preset'] = isDev ? 'nitro-dev' : 'node'
  const outDir = resolve(rootDir, '.output')

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
      buildDir: join(outDir, '.nitro'),
      serveStatic: !isDev,
      output: {
        dir: outDir,
      },
      timing: true,
      replace: {
        'import.meta.test': JSON.stringify(true),
      },
    }),
  }

  provideTestContext(ctx)

  return ctx
}

export function injectTestContext() {
  return currentContext
}

export function provideTestContext(context: TestContext) {
  currentContext = context
}

export function clearTestContext() {
  currentContext = undefined
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
