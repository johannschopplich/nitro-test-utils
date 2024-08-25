// eslint-disable-next-line antfu/no-import-dist
import { defineConfig } from './dist/config.mjs'

export default defineConfig({
  test: {
    include: ['test/routes.test.ts', 'test/setup.test.ts'],
    forceRerunTriggers: [
      '**/test/fixture/**/*.ts',
      '**/test/fixture2/**/*.ts',

      '**/src/**/*.ts',
    ],
  },
})
