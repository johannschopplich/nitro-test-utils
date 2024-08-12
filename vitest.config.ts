// eslint-disable-next-line antfu/no-import-dist
import { defineConfig } from './dist/config.mjs'

export default defineConfig({
  test: {
    include: ['test/routes.test.ts'],
  },
  nitro: {
    rootDir: 'test/fixture',
  },
})
