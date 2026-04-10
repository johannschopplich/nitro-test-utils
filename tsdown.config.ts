import type { UserConfig } from 'tsdown/config'
import { defineConfig } from 'tsdown/config'

const config: UserConfig = defineConfig({
  entry: {
    'index': 'src/index.ts',
    'config': 'src/config.ts',
    'e2e': 'src/e2e.ts',
    'global-setup': 'src/vitest/global-setup.ts',
    'worker-setup': 'src/vitest/worker-setup.ts',
  },
  deps: {
    neverBundle: [
      'nitro',
      'vite',
      'vitest',
      'vitest/config',
    ],
  },
  dts: true,
  unbundle: true,
})

export default config
