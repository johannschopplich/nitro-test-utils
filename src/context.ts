import type { PreviewInstance } from 'nitro/builder'
import type { Nitro } from 'nitro/types'
import type { NitroTestOptions } from './types'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import * as dotenv from 'dotenv'
import { createNitro } from 'nitro/builder'

export interface NitroTestContext {
  options: Required<Pick<NitroTestOptions, 'rootDir' | 'mode'>> & Pick<NitroTestOptions, 'preset'>
  isGlobal: boolean
  isDev: boolean
  nitro: Nitro
  preview?: PreviewInstance
  /** Restores the Wrangler deploy redirect that a Cloudflare production build rewrote. */
  restoreWranglerRedirect?: () => void
}

// Nitro's well-known directory, where it writes `last-build.json` whatever the `buildDir`.
export const NITRO_BUILD_DIR = 'node_modules/.nitro'

// Nitro's preview finds a fetch handler in these entries; Cloudflare presets run in `wrangler` instead.
const IN_PROCESS_PRODUCTION_PRESETS = new Set(['standard', 'node-server'])

// Store the active context on `globalThis` so it survives across multiple module copies.
// When this project's own tests import from source while Vitest loads the built worker
// setup from `dist/`, both copies would otherwise have independent module-level state.
declare global {
  // eslint-disable-next-line vars-on-top
  var __nitroTestContext__: NitroTestContext | undefined
  // eslint-disable-next-line vars-on-top
  var __nitroTestBuildCount__: number | undefined
}

export async function createTestContext(options: NitroTestOptions & { isGlobal?: boolean }): Promise<NitroTestContext> {
  const {
    mode = 'development',
    rootDir = process.cwd(),
    preset: userPreset,
    isGlobal = false,
  } = options
  const isDev = mode === 'development'
  const preset = resolvePreset(mode, userPreset)

  setupDotenv({ rootDir })

  const nitro = await createNitro(
    {
      preset,
      dev: isDev,
      rootDir,
      builder: resolveTestBuilder(),
      buildDir: NITRO_BUILD_DIR,
      ...(!isDev && {
        output: {
          dir: resolveOutputDir(rootDir, preset, nextBuildIndex()),
        },
      }),
    },
    {
      c12: {
        envName: 'test',
        // Nitro's own asset handler respects `baseURL`; the preview's fallback for `standard` doesn't.
        // A default, so the app's own `serveStatic` still wins.
        ...(!isDev && !isCloudflarePreset(preset) && {
          defaultConfig: { serveStatic: true },
        }),
      },
    },
  )

  if (!isDev) {
    try {
      assertProductionPreset(nitro.options.preset, isGlobal)
    }
    catch (error) {
      await nitro.close()
      throw error
    }
  }

  const ctx: NitroTestContext = {
    options: {
      rootDir,
      mode,
      preset: userPreset,
    },
    isGlobal,
    isDev,
    nitro,
  }

  provideTestContext(ctx)

  return ctx
}

export function resolvePreset(mode: NitroTestOptions['mode'], preset?: string): string {
  return preset ?? (mode === 'production'
    ? 'standard'
    : 'nitro-dev')
}

/**
 * Resolves a separate output directory for each production build in the worker.
 *
 * @remarks
 * Node caches ES modules by path for the lifetime of the worker. A build into a directory an
 * earlier build already loaded from would serve that build's modules and app state.
 */
export function resolveOutputDir(rootDir: string, preset: string, buildIndex: number): string {
  return path.resolve(rootDir, NITRO_BUILD_DIR, 'output', preset, String(buildIndex))
}

/**
 * Mirrors the check Nitro's `startPreview` uses to run a build in `wrangler`.
 *
 * @remarks
 * Case-insensitive, since a raw preset name may be camel case before Nitro resolves it.
 */
export function isCloudflarePreset(preset: string): boolean {
  return preset.toLowerCase().includes('cloudflare')
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

function nextBuildIndex(): number {
  const buildIndex = globalThis.__nitroTestBuildCount__ ?? 0
  globalThis.__nitroTestBuildCount__ = buildIndex + 1
  return buildIndex
}

function assertProductionPreset(preset: string, isGlobal: boolean): void {
  if (isCloudflarePreset(preset)) {
    if (isGlobal) {
      throw new Error(
        'Global production mode does not support Cloudflare presets, since nothing stops the '
        + 'spawned `wrangler` process when Vitest ends its worker. Call `setup()` per test suite instead.',
      )
    }
    return
  }

  if (!IN_PROCESS_PRODUCTION_PRESETS.has(preset)) {
    throw new Error(
      `Production mode supports the "standard" and "node-server" presets and Cloudflare presets, not "${preset}".`,
    )
  }
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
