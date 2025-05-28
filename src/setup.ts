import type { GlobalSetupContext } from 'vitest/node'
import type { NitroInlineConfig } from './config'
import { createTestContext } from './context'
import { startServer, stopServer } from './server'

type GlobalSetupContextWithNitro = GlobalSetupContext & {
  config: { nitro: NitroInlineConfig }
}

// Setup shared Nitro instance
// See https://vitest.dev/config/#globalsetup
async function setup({ config, provide }: GlobalSetupContextWithNitro): Promise<(() => Promise<void>) | undefined> {
  if (!config.nitro.global)
    return

  await createTestContext({
    rootDir: config.nitro.global.rootDir || config.root,
    mode: config.nitro.global.mode,
    isGlobal: true,
  })

  const ctx = await startServer()

  // Global setup is run in a different global scope, so tests don't have access
  // to variables defined here. We need to expose the server URL for tests.
  provide('server', { url: ctx.server!.url })

  return async function () {
    await stopServer()
  }
}

export default setup
