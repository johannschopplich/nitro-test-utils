import type { UserConfig as ViteUserConfig } from 'vite'
import type { TestOptions } from './types'
import { fileURLToPath } from 'node:url'
import { loadOptions as loadNitroOptions } from 'nitropack'
import { join } from 'pathe'
import { mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'

export interface NitroInlineConfig {
  /**
   * Whether to add the Nitro source directory to rerun tests when source files change.
   *
   * @default true
   */
  rerunOnSourceChanges?: boolean

  /**
   * Options for a global Nitro server instance for all tests.
   */
  global?: TestOptions

  /**
   * @deprecated Use the `global.rootDir` option instead.
   * @default 'development'
   */
  mode?: 'development' | 'production'

  /**
   * @deprecated Use the `global.rootDir` option instead.
   * @default process.cwd()
   */
  rootDir?: string
}

declare module 'vite' {
  interface UserConfig {
    /**
     * Options for the Nitro test runner.
     */
    nitro?: Omit<NitroInlineConfig, 'global'> & {
      global?: boolean | TestOptions
    }
  }
}

export async function defineConfig(userConfig: ViteUserConfig = {}): Promise<ViteUserConfig> {
  const currentDir = fileURLToPath(new URL('.', import.meta.url))
  const resolvedGlobalConfig: NitroInlineConfig['global'] = userConfig.nitro?.global === true ? {} : userConfig.nitro?.global || undefined
  const resolvedNitroConfig: NitroInlineConfig = {
    rerunOnSourceChanges: userConfig.nitro?.rerunOnSourceChanges ?? true,
    global: resolvedGlobalConfig
      ? {
          rootDir: userConfig.nitro?.rootDir || resolvedGlobalConfig.rootDir || undefined,
          mode: userConfig.nitro?.mode || resolvedGlobalConfig.mode || undefined,
        }
      : undefined,
  }

  const overrides = defineVitestConfig({
    test: {
      poolOptions: {
        forks: {
          // Disabling isolation improves performance in Node environments
          isolate: false,
          singleFork: true,
        },
      },
      forceRerunTriggers: [
        // Vitest defaults
        '**/package.json/**',
        '**/{vitest,vite}.config.*/**',
        // Custom triggers
        ...(userConfig.test?.forceRerunTriggers ?? []),
        // Rerun tests when source files change
        ...(resolvedNitroConfig.rerunOnSourceChanges
          ? resolvedNitroConfig.global
            ? [join(
                resolvedNitroConfig.global.rootDir || '',
                '.output',
                resolvedNitroConfig.global.mode === 'production' ? 'server' : '.nitro/dev',
                'index.mjs',
              )]
            : [`${(await loadNitroOptions()).srcDir}/**/*.ts`]
          : []),
      ],
      globalSetup: resolvedNitroConfig.global
        ? [
            join(currentDir, 'setup.js'),
          ]
        : undefined,
      // @ts-expect-error: Append Nitro for global setup file
      nitro: resolvedNitroConfig,
    },
  }) as ViteUserConfig

  return mergeConfig(userConfig, overrides)
}
