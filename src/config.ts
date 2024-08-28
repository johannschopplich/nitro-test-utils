import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import { loadOptions as loadNitroOptions } from 'nitropack'
import type { UserConfig as ViteUserConfig } from 'vite'

export interface NitroInlineConfig {
  /**
   * Whether to add the Nitro source directory to rerun tests when source files change.
   *
   * @default true
   */
  rerunOnSourceChanges?: boolean

  global?: {
    /**
     * Path th a directory with a Nitro app to be put under test.
     *
     * @default process.cwd()
     */
    rootDir?: string

    /**
     * Whether to build the Nitro server in development mode or for production.
     *
     * @remarks
     * The Nitro build preset is automatically set based on this option. If this is set to `development`, the preset `nitro-dev` will be used. Otherwise, Nitro will is built with the `node` preset.
     *
     * @default 'development'
     */
    mode?: 'development' | 'production'
  }
}

declare module 'vite' {
  interface UserConfig {
    /**
     * Options for Nitro
     */
    nitro?: NitroInlineConfig
  }
}

export async function defineConfig(userConfig: ViteUserConfig = {}): Promise<ViteUserConfig> {
  const currentDir = fileURLToPath(new URL('.', import.meta.url))
  const { nitro } = userConfig

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
        ...(userConfig.test?.forceRerunTriggers ?? []),
        ...(nitro?.global
          ? [join(
              nitro?.global?.rootDir || '',
              '.output',
              nitro?.global?.mode === 'production' ? 'server' : '.nitro/dev',
              'index.mjs',
            )]
          : (nitro?.rerunOnSourceChanges ?? true)
              ? [`${(await loadNitroOptions()).srcDir}/**/*.ts`]
              : []
        ),
      ],
      globalSetup: nitro?.global
        ? [
            join(currentDir, 'setup.mjs'),
          ]
        : undefined,
      // @ts-expect-error: Append Nitro for global setup file
      nitro,
    },
  }) as ViteUserConfig

  return mergeConfig(userConfig, overrides)
}
