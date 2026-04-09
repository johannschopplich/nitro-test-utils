import type { ViteUserConfig as UserConfig } from 'vitest/config'
import type { NitroTestOptions } from './types'
import * as path from 'node:path'
import { loadOptions as loadNitroOptions } from 'nitro/builder'
import { mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import { NITRO_BUILD_DIR, NITRO_OUTPUT_DIR } from './context'

export interface NitroInlineConfig {
  /**
   * Whether to add the Nitro source directory to rerun tests when source files change.
   *
   * @default true
   */
  rerunOnSourceChanges?: boolean

  /**
   * Options for a global Nitro server instance for all tests.
   * Set to `true` to enable with default options.
   */
  global?: boolean | NitroTestOptions
}

export interface ResolvedNitroInlineConfig {
  rerunOnSourceChanges: boolean
  global?: NitroTestOptions
}

export async function defineConfig(userConfig: UserConfig = {}, nitroConfig: NitroInlineConfig = {}): Promise<UserConfig> {
  const resolvedGlobalConfig = nitroConfig.global === true ? {} : nitroConfig.global || undefined
  const resolvedNitroConfig: ResolvedNitroInlineConfig = {
    rerunOnSourceChanges: nitroConfig.rerunOnSourceChanges ?? true,
    global: resolvedGlobalConfig
      ? {
          rootDir: resolvedGlobalConfig.rootDir || undefined,
          mode: resolvedGlobalConfig.mode || undefined,
          preset: resolvedGlobalConfig.preset || undefined,
        }
      : undefined,
  }

  const userConfigOverrides = defineVitestConfig({
    test: {
      // Disabling isolation improves performance in Node environments
      isolate: false,
      maxWorkers: 1,
      forceRerunTriggers: [
        // Vitest defaults
        '**/package.json/**',
        '**/{vitest,vite}.config.*/**',
        // Rerun tests when source files change
        ...await resolveSourceRerunTriggers(resolvedNitroConfig),
      ],
      globalSetup: resolvedNitroConfig.global
        ? [path.join(import.meta.dirname, 'setup.mjs')]
        : undefined,
      // @ts-expect-error: `nitro` is a custom property used internally by the setup script
      nitro: resolvedNitroConfig,
    },
  }) as UserConfig

  return mergeConfig(userConfig, userConfigOverrides)
}

async function resolveSourceRerunTriggers(config: ResolvedNitroInlineConfig): Promise<string[]> {
  if (!config.rerunOnSourceChanges)
    return []

  let watchPattern: string

  if (config.global) {
    const rootDir = config.global.rootDir || ''
    watchPattern = config.global.mode === 'production'
      ? path.join(rootDir, NITRO_OUTPUT_DIR, 'server', 'index.mjs')
      : path.join(rootDir, NITRO_BUILD_DIR, 'dev', 'index.mjs')
  }
  else {
    const options = await loadNitroOptions()
    const dir = typeof options.serverDir === 'string' ? options.serverDir : options.rootDir
    watchPattern = path.join(dir, '**/*.ts')
  }

  return [watchPattern]
}
