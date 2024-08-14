import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { defu } from 'defu'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import { type UserConfig as ViteUserConfig, mergeConfig } from 'vite'
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

  const { nitro, ..._config } = defu<ViteUserConfig, [ViteUserConfig]>(config, {
    nitro: {
      mode: 'development',
    },
  })

  const overrides = defineVitestConfig({
    test: {
      poolOptions: {
        forks: {
          // Disabling isolation improves performance in this case
          isolate: false,
          singleFork: true,
        },
      },
      forceRerunTriggers: [
        ...(_config.test?.forceRerunTriggers
          ? []
          : [
              // Vitest defaults
              '**/package.json/**',
              '**/{vitest,vite}.config.*/**',
            ]),
        // Re-run tests when Nitro is rebuilt
        join(
          nitro?.rootDir || '',
          NITRO_OUTPUT_DIR,
          nitro?.mode === 'production' ? 'server' : '.nitro/dev',
          'index.mjs',
        ),
      ],
      globalSetup: [
        join(currentDir, 'setup.mjs'),
      ],
      // @ts-expect-error: Append Nitro config to access in global setup file
      nitro,
    },
  }) as ViteUserConfig

  return mergeConfig(_config, overrides)
}
