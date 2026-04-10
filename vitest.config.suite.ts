import type { UserConfig } from 'vite'
import { configDefaults } from 'vitest/config'
// eslint-disable-next-line antfu/no-import-dist
import { defineConfig } from './dist/config.mjs'

const config: Promise<UserConfig> = defineConfig({
  test: {
    name: 'suite',
    dir: './test',
    exclude: [
      ...configDefaults.exclude,
      '**/global/**',
    ],
  },
})

export default config
