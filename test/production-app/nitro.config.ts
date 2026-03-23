import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  compatibilityDate: '2025-06-01',
  serverDir: '.',
  typescript: {
    generateTsConfig: true,
  },
})
