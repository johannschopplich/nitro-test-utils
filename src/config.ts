import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config'
import type { UserConfig as ViteUserConfig } from 'vite'

export interface NitroInlineConfig {
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

export function defineNitroTestConfig(config: ViteUserConfig): ViteUserConfig {
  const currentDir = fileURLToPath(new URL('.', import.meta.url))
  const resolvedConfig = defineVitestConfig(config)

  return mergeConfig(resolvedConfig, {
    test: {
      globalSetup: [join(currentDir, 'setup.mjs')],
      // Duplicate Nitro config to resolved Vitest config for global setup file
      nitro: config.nitro,
    },
  })
}
