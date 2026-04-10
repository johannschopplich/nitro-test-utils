import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  compatibilityDate: '2026-01-01',
  serverDir: '.',
  // Verify `NITRO_*` envirionment variables propagation
  runtimeConfig: {
    dynamicValue: '',
  },
  typescript: {
    generateTsConfig: true,
  },
})
