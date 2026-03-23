import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  compatibilityDate: '2026-01-01',
  serverDir: '.',
  typescript: {
    generateTsConfig: true,
  },
})
