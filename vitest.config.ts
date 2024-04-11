// eslint-disable-next-line antfu/no-import-dist
import { defineNitroTestConfig } from './dist/config.mjs'

export default defineNitroTestConfig({
  nitro: {
    rootDir: 'test/fixture',
  },
})
