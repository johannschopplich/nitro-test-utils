// eslint-disable-next-line antfu/no-import-dist
import { defineConfig } from './dist/config.mjs'

export default defineConfig({
  test: {
    forceRerunTriggers: [
      '**/test/fixture/**/*.ts',
      '**/test/fixture2/**/*.ts',
      '**/src/**/*.ts',
    ],
  },
  nitro: {
    forceRerunTriggersOnSrcDir: false,
  },
})
