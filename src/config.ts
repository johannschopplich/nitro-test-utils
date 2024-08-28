import { defineConfig as defineVitestConfig } from 'vitest/config'
import { type UserConfig as ViteUserConfig, mergeConfig } from 'vite'
import defu from 'defu'
import { loadOptions as loadNitroOptions } from 'nitropack'

export interface NitroInlineConfig {
  /**
   * Whether to add the Nitro source directory to force rerun triggers.
   *
   * @default true
   */
  forceRerunTriggersOnSrcDir?: boolean
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
  const { nitro, ..._config } = defu(userConfig, {
    nitro: {
      forceRerunTriggersOnSrcDir: true,
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
      forceRerunTriggers: nitro?.forceRerunTriggersOnSrcDir
        ? [`${(await loadNitroOptions()).srcDir}/**/*.ts`]
        : [],
    },
  }) as ViteUserConfig

  return mergeConfig(_config, overrides)
}
