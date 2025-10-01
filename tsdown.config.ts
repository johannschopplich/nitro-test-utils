import type { UserConfig, UserConfigFn } from 'tsdown/config'
import { defineConfig } from 'tsdown/config'

const config: UserConfig | UserConfigFn = defineConfig({
  entry: {
    index: 'src/index.ts',
    config: 'src/config.ts',
    e2e: 'src/e2e.ts',
    setup: 'src/setup.ts',
  },
  external: [
    'vite',
    'vitest',
    'vitest/config',
  ],
  dts: true,
  unbundle: true,
})

export default config
