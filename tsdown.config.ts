import type { UserConfig, UserConfigFn } from 'tsdown/config'
import { defineConfig } from 'tsdown/config'

const config: UserConfig | UserConfigFn = defineConfig({
  entry: [
    'src/index.ts',
    'src/e2e.ts',
    'src/config.ts',
    'src/setup.ts',
  ],
  external: [
    'vite',
    'vitest',
    'vitest/config',
  ],
  dts: true,
  unbundle: true,
})

export default config
