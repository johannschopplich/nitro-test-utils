import { definePlugin } from 'nitro'
import { useNitroHooks } from 'nitro/app'

declare global {
  // eslint-disable-next-line vars-on-top
  var __closedNitroApps__: number | undefined
}

// Counts closed apps on `globalThis`, which an in-process build shares with the test.
export default definePlugin(() => {
  useNitroHooks().hook('close', () => {
    globalThis.__closedNitroApps__ = (globalThis.__closedNitroApps__ ?? 0) + 1
  })
})
