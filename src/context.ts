import type { PreviewInstance } from 'nitro/builder'
import type { Nitro } from 'nitro/types'
import type { NitroTestOptions } from './types'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { resolveModulePath } from 'exsolve'
import { createNitro } from 'nitro/builder'

export interface NitroTestContext {
  options: Required<Pick<NitroTestOptions, 'rootDir' | 'mode'>> & Pick<NitroTestOptions, 'preset'>
  isGlobal: boolean
  isDev: boolean
  nitro: Nitro
  preview?: PreviewInstance
  /** `wrangler`'s bin script, set for production builds that run in `wrangler dev`. */
  wranglerBin?: string
}

// Nitro's well-known directory, where it writes `last-build.json` whatever the `buildDir`.
export const NITRO_WELLKNOWN_DIR = 'node_modules/.nitro'
// Apart from Nitro's default `buildDir`, so a running `nitro dev` and the tests don't overwrite
// each other's build.
export const TEST_BUILD_DIR: string = `${NITRO_WELLKNOWN_DIR}/test`

// Nitro's preview finds a fetch handler in these entries.
const IN_PROCESS_PRODUCTION_PRESETS = new Set(['standard', 'node-server'])
// Nitro previews these with `wrangler dev`. The Pages presets need `wrangler pages dev`, and Nitro
// deprecates `cloudflare-durable` in favor of `cloudflare-module`.
const WRANGLER_PRODUCTION_PRESETS = new Set(['cloudflare-module'])

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
  const productionPreset = isDev
    ? undefined
    : resolveProductionPreset(userPreset)

  const nitro = await createNitro(
    {
      // Without a preset, development mode emulates the one from the Nitro config or `NITRO_PRESET`,
      // like `nitro dev`.
      preset: productionPreset ?? userPreset,
      dev: isDev,
      rootDir,
      buildDir: TEST_BUILD_DIR,
      ...(productionPreset && {
        output: {
          dir: resolveOutputDir(rootDir, productionPreset, nextBuildIndex()),
        },
      }),
    },
    {
      // Nitro's default files plus `.env.test`. Later files win; variables from the shell beat all of them.
      dotenv: {
        fileName: ['.env', '.env.local', '.env.test'],
      },
      c12: {
        envName: 'test',
        // Nitro's own asset handler respects `baseURL`; the static middleware `startPreview` puts in
        // front of the entry doesn't.
        // A default, so the app's own `serveStatic` still wins.
        ...(productionPreset && !isCloudflarePreset(productionPreset) && {
          defaultConfig: { serveStatic: true },
        }),
      },
    },
  )

  let wranglerBin: string | undefined

  if (!isDev) {
    try {
      assertProductionPreset(nitro.options.preset, isGlobal)
      // Resolved before the build, so a missing `wrangler` fails fast.
      if (WRANGLER_PRODUCTION_PRESETS.has(nitro.options.preset))
        wranglerBin = resolveWranglerBin(rootDir)
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
    wranglerBin,
  }

  provideTestContext(ctx)

  return ctx
}

export function resolveProductionPreset(preset?: string): string {
  return preset ?? 'standard'
}

/**
 * Resolves a separate output directory for each production build in the worker.
 *
 * @remarks
 * Node caches ES modules by path for the lifetime of the worker. A build into a directory an
 * earlier build already loaded from would serve that build's modules and app state.
 */
export function resolveOutputDir(rootDir: string, preset: string, buildIndex: number): string {
  return path.resolve(rootDir, TEST_BUILD_DIR, 'output', preset, String(buildIndex))
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

// Case-insensitive, since the raw preset name may be camel case before Nitro resolves it.
function isCloudflarePreset(preset: string): boolean {
  return preset.toLowerCase().includes('cloudflare')
}

function assertProductionPreset(preset: string, isGlobal: boolean): void {
  if (WRANGLER_PRODUCTION_PRESETS.has(preset)) {
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
      `Production mode supports the "standard", "node-server", and "cloudflare-module" presets, not "${preset}".`,
    )
  }
}

function resolveWranglerBin(rootDir: string): string {
  const packageJsonPath = resolveModulePath('wrangler/package.json', {
    from: rootDir,
    try: true,
    // exsolve also caches failed lookups, which would outlive installing `wrangler` in watch mode.
    cache: false,
  })

  if (!packageJsonPath)
    throw new Error(`Couldn't resolve \`wrangler\` from ${rootDir}. Testing a Cloudflare production build needs it installed in the Nitro project.`)

  const { bin } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { bin: Record<string, string> }
  return path.resolve(path.dirname(packageJsonPath), bin.wrangler!)
}
