import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { defu } from 'defu'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import { type UserConfig as ViteUserConfig, mergeConfig } from 'vite'

export interface NitroInlineConfig {
  /**
   * The mode to run Nitro in.
   *
   * @default 'development'
   */
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
    },
  }) as ViteUserConfig

  return mergeConfig(_config, overrides)
}
