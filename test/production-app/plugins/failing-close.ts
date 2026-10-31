import process from 'node:process'
import { definePlugin } from 'nitro'
import { useNitroHooks } from 'nitro/app'

export default definePlugin(() => {
  useNitroHooks().hook('close', () => {
    if (process.env.NITRO_TEST_UTILS_FAIL_CLOSE)
      throw new Error('Close hook failed')
  })
})
