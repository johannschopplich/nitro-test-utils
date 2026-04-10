import type { UserConfig } from 'vite'
import { defineConfig } from 'vitest/config'

const config: UserConfig = defineConfig({
  test: {
    projects: [
      './vitest.config.suite.ts',
      './vitest.config.global.ts',
    ],
  },
})

export default config
