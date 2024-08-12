import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { defu } from 'defu'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import type { UserConfig as ViteUserConfig } from 'vite'
import { NITRO_OUTPUT_DIR } from './constants'

export interface NitroInlineConfig {
  /** @default 'development' */
  mode?: 'development' | 'production'
  rootDir?: string
}

declare module 'vite' {
  interface UserConfig {
    /**
     * Options for Nitro
     */
    nitro?: NitroInlineConfig
  }
}

export function defineConfig(config: ViteUserConfig = {}): ViteUserConfig {
  const currentDir = fileURLToPath(new URL('.', import.meta.url))

  const _config = defu<ViteUserConfig, [ViteUserConfig]>(config, {
    nitro: {
      mode: 'development',
    },
  })
  const { test } = config

  return defineVitestConfig({
    ...config,
    test: {
      ...test,
      poolOptions: {
        ...test?.poolOptions,
        forks: {
          ...test?.poolOptions?.forks,
          // Disabling isolation improves performance in this case
          isolate: false,
          singleFork: true,
        },
      },
      forceRerunTriggers: [
        ...(
          test?.forceRerunTriggers
            ? test?.forceRerunTriggers
            : [
              // Vitest defaults
                '**/package.json/**',
                '**/{vitest,vite}.config.*/**',
              ]
        ),
        // Re-run tests when Nitro is rebuilt
        join(
          _config.nitro?.rootDir || '',
          NITRO_OUTPUT_DIR,
          _config.nitro?.mode === 'production' ? 'server' : '.nitro/dev',
          'index.mjs',
        ),
      ],
      globalSetup: [
        ...(test?.globalSetup ? test?.globalSetup : []),
        join(currentDir, 'setup.mjs'),
      ],
      // @ts-expect-error: Append Nitro config to access in global setup file
      nitro: _config.nitro,
    },
  })
}
