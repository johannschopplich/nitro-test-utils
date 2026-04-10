import type { NitroTestContext, NitroTestOptions } from './types'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import * as dotenv from 'dotenv'
import { createNitro } from 'nitro/builder'

export const NITRO_OUTPUT_DIR = '.output'
export const NITRO_BUILD_DIR = 'node_modules/.nitro'

// Only presets that dispatch via `useNitroApp()` at module init
// (without starting their own HTTP listener)
const NODE_COMPATIBLE_PRESETS = new Set([
  'nitro-dev',
  'node',
  'node-middleware',
  'bun',
])

// Store the active context on `globalThis` so it survives across multiple module copies.
// When this project's own tests import from source while Vitest loads the built worker
// setup from `dist/`, both copies would otherwise have independent module-level state.
declare global {
  // eslint-disable-next-line vars-on-top
  var __nitroTestContext__: NitroTestContext | undefined
}

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
      builder: resolveTestBuilder(),
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
  return globalThis.__nitroTestContext__
}

export function provideTestContext(context: NitroTestContext): void {
  globalThis.__nitroTestContext__ = context
}

export function clearTestContext(): void {
  globalThis.__nitroTestContext__ = undefined
}

function setupDotenv({
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

function resolveTestBuilder(): 'rollup' | 'rolldown' {
  const builder = process.env.NITRO_BUILDER
  if (builder === 'rollup' || builder === 'rolldown') {
    return builder
  }
  return 'rolldown'
}
