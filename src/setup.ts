import type { TestProject } from 'vitest/node'
import type { NitroInlineConfig } from './config'
import { createTestContext } from './context'
import { startServer, stopServer } from './server'

type GlobalSetupContextWithNitro = TestProject & {
  config: { nitro: NitroInlineConfig }
}

// Setup shared Nitro instance
// See https://vitest.dev/config/#globalsetup
async function setup(project: GlobalSetupContextWithNitro): Promise<(() => Promise<void>) | undefined> {
  if (!project.config.nitro.global)
    return

  await createTestContext({
    rootDir: project.config.nitro.global.rootDir || project.config.root,
    mode: project.config.nitro.global.mode,
    isGlobal: true,
  })

  const ctx = await startServer()

  // Global setup is run in a different global scope, so tests don't have access
  // to variables defined here. We need to expose the server URL for tests.
  project.provide('server', { url: ctx.server!.url })

  return async function () {
    await stopServer()
  }
}

export default setup
