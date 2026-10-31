import type { NitroTestOptions } from './types'
import { clearTestContext, createTestContext, injectTestContext } from './context'
import { startServer, stopServer } from './server'

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

  await createTestContext(options)

  vitest.beforeAll(async () => {
    await startServer()
  })

  vitest.afterAll(async () => {
    await stopServer()

    clearTestContext()
  })
}
