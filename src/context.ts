import type { NitroTestContext, NitroTestOptions } from './types'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import * as dotenv from 'dotenv'
import { createNitro } from 'nitro/builder'

export const NITRO_OUTPUT_DIR = '.output'
export const NITRO_BUILD_DIR = 'node_modules/.nitro'

const NODE_COMPATIBLE_PRESETS = new Set([
  'nitro-dev',
  'node',
  'node-server',
  'node-middleware',
  'node-cluster',
  'bun',
])

let currentContext: NitroTestContext | undefined

export async function createTestContext(options: NitroTestOptions & { isGlobal?: boolean }): Promise<NitroTestContext> {
  const {
    mode = 'development',
    rootDir = process.cwd(),
    preset: userPreset,
    isGlobal = false,
  } = options
  const isDev = mode === 'development'
  const preset = userPreset ?? (isDev ? 'nitro-dev' : 'node-middleware')

  if (!isDev && userPreset && !NODE_COMPATIBLE_PRESETS.has(userPreset)) {
    throw new Error(
      `Production mode is not supported for the "${userPreset}" preset. `
      + 'Only Node.js-compatible presets can be used in production mode. '
      + 'Use development mode instead, which provides local bindings emulation.',
    )
  }

  setupDotenv({ rootDir })

  const ctx: NitroTestContext = {
    options: {
      rootDir,
      mode,
      preset: userPreset,
    },
    isGlobal,
    isDev,
    nitro: await createNitro({
      preset,
      dev: isDev,
      rootDir,
      buildDir: NITRO_BUILD_DIR,
      serveStatic: !isDev,
      output: {
        dir: path.resolve(rootDir, NITRO_OUTPUT_DIR),
      },
      replace: {
        'import.meta.test': JSON.stringify(true),
      },
    }),
  }

  provideTestContext(ctx)

  return ctx
}

export function injectTestContext(): NitroTestContext | undefined {
  return currentContext
}

export function provideTestContext(context: NitroTestContext): void {
  currentContext = context
}

export function clearTestContext(): void {
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
} = {}): Record<string, string> {
  const environment: Record<string, string> = Object.create(null)
  const dotenvFile = path.resolve(rootDir, fileName)

  if (fs.existsSync(dotenvFile)) {
    const parsed = dotenv.parse(fs.readFileSync(dotenvFile, 'utf8'))
    Object.assign(environment, parsed)
  }

  // Fill environment variables
  for (const key in environment) {
    if (override || process.env[key] === undefined)
      process.env[key] = environment[key]
  }

  return environment
}
