import { inject } from 'vitest'
import { createTestContext, injectTestContext } from '../context'
import { startServer } from '../server'

declare global {
  // eslint-disable-next-line vars-on-top
  var __nitroTestInitialized__: boolean | undefined
}

/**
 * Worker-side setup file registered via `test.setupFiles`. Vitest re-executes this file
 * before every test file even with `isolate: false`, so the `globalThis` guard is what
 * builds and starts the Nitro app exactly once per worker.
 *
 * @remarks
 * Nitro initialization lives here (not in `global-setup.ts`) because `isolate: false`
 * keeps the app instance cached as module-level state across test files, which is what
 * lets tests reach the in-process dispatcher.
 */
if (!globalThis.__nitroTestInitialized__) {
  const nitroTestConfig = inject('nitroTestConfig')

  if (nitroTestConfig?.global) {
    globalThis.__nitroTestInitialized__ = true

    // A previous file inside the same worker may already have created a per-suite context.
    // Only create a global one when nothing else owns the worker's context yet.
    if (!injectTestContext()) {
      await createTestContext({
        ...nitroTestConfig.global,
        isGlobal: true,
      })
      await startServer()
    }
  }
}
