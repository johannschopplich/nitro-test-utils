import type { NitroTestOptions } from './types'
import { clearTestContext, createTestContext, injectTestContext } from './context'
import { snapshotDevBuildInfo, snapshotEnv, startServer, stopServer } from './server'

// On `globalThis`, so it survives several module copies.
declare global {
  // eslint-disable-next-line vars-on-top
  var __nitroTestSuiteClaimed__: boolean | undefined
}

/**
 * @example
 * import { resolve } from 'node:path'
 * import { setup } from 'nitro-test-utils'
 *
 * await setup({
 *  rootDir: resolve(import.meta.dirname, 'fixture'),
 * })
 */
export async function setup(options: NitroTestOptions = {}): Promise<void> {
  const vitest = await import('vitest')

  if (injectTestContext()?.isGlobal) {
    throw new Error('Nitro app is already running in global setup.')
  }

  let startup: Promise<unknown> | undefined
  let restoreEnv: () => void
  let restoreDevBuildInfo: () => void

  // Context created in `beforeAll`, since Vitest collects every suite of a file before it runs any.
  vitest.beforeAll(async () => {
    if (globalThis.__nitroTestSuiteClaimed__) {
      throw new Error('A Nitro app is already running for an enclosing or concurrent suite.')
    }

    // Nitro loads the app's `.env` files into `process.env`, where they would leak into later suites.
    restoreEnv = snapshotEnv()
    restoreDevBuildInfo = snapshotDevBuildInfo(options.rootDir)
    // Claimed before the first `await`, so a concurrent suite sees it.
    globalThis.__nitroTestSuiteClaimed__ = true
    startup = createTestContext(options).then(startServer)
    await startup
  })

  // Vitest runs `afterAll` even when `beforeAll` threw or timed out, so only the suite that claimed
  // the slot stops its app, once its start has settled.
  vitest.afterAll(async () => {
    if (!startup)
      return

    try {
      await startup.catch(() => {})
      await stopServer()
    }
    finally {
      restoreEnv()
      restoreDevBuildInfo()
      // A leftover context or claim would fail every later `setup()` in the worker.
      clearTestContext()
      globalThis.__nitroTestSuiteClaimed__ = undefined
    }
  })
}
