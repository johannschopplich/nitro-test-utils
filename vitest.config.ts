// eslint-disable-next-line antfu/no-import-dist
import { defineConfig } from './dist/config.mjs'

export default defineConfig({
  nitro: {
    rootDir: 'test/fixture',
  },
})
