import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
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

  config.nitro ||= {}
  config.nitro.mode ||= 'development'

  return defineVitestConfig({
    test: {
      poolOptions: {
        threads: {
          // Test isolation impacts performance negatively and
          // is not needed in Node environment
          isolate: false,
          singleThread: true,
        },
      },
      forceRerunTriggers: [
        // Vitest defaults
        '**/package.json/**',
        '**/{vitest,vite}.config.*/**',
        // Re-run tests when Nitro is rebuilt
        join(
          config.nitro?.rootDir || '',
          NITRO_OUTPUT_DIR,
          config.nitro?.mode === 'development' ? '.nitro/dev' : 'server',
          'index.mjs',
        ),
      ],
      globalSetup: [
        join(currentDir, 'setup.mjs'),
      ],
      // @ts-expect-error: Append Nitro config to access in global setup file
      nitro: config.nitro,
    },
  })
}
