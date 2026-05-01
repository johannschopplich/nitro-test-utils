import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  compatibilityDate: '2026-01-01',
  serverDir: '.',
  // Verify `NITRO_*` environment variables propagation
  runtimeConfig: {
    dynamicValue: '',
    fromTestConfig: 'base',
  },
  // Verify C12 `$test` env-specific config
  $test: {
    runtimeConfig: {
      dynamicValue: '',
      fromTestConfig: 'applied',
    },
  },
  typescript: {
    generateTsConfig: true,
  },
})
