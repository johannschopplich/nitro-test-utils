import { defu } from 'defu'
import { mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import { loadOptions as loadNitroOptions } from 'nitropack'
import type { UserConfig as ViteUserConfig } from 'vite'

export interface NitroInlineConfig {
  /**
   * Whether to add the Nitro source directory to force rerun triggers.
   *
   * @default true
   */
  rerunOnSourceChanges?: boolean
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
  const { nitro, ...config } = defu(userConfig, {
    nitro: {
      rerunOnSourceChanges: true,
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
      forceRerunTriggers: nitro?.rerunOnSourceChanges
        ? [`${(await loadNitroOptions()).srcDir}/**/*.ts`]
        : [],
    },
  }) as ViteUserConfig

  return mergeConfig(config, overrides)
}
