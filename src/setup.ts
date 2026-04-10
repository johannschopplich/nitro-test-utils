import type { TestProject } from 'vitest/node'
import type { ResolvedNitroTestConfig } from './config'
import { createTestContext } from './context'
import { collectRoutes } from './e2e'
import { startServer, stopServer } from './server'

type GlobalSetupContextWithNitro = TestProject & {
  config: { nitro: ResolvedNitroTestConfig }
}

// Setup shared Nitro instance
// See https://vitest.dev/config/#globalsetup
async function setup(project: GlobalSetupContextWithNitro): Promise<(() => Promise<void>) | undefined> {
  if (!project.config.nitro.global)
    return

  await createTestContext({
    rootDir: project.config.nitro.global.rootDir || project.config.root,
    mode: project.config.nitro.global.mode,
    preset: project.config.nitro.global.preset,
    isGlobal: true,
  })

  const ctx = await startServer()

  // Global setup is run in a different global scope, so tests don't have access
  // to variables defined here. Expose both the server URL and a serializable
  // snapshot of the registered routes so `listRoutes()` works cross-scope.
  project.provide('server', { url: ctx.server!.url })
  project.provide('nitroRoutes', collectRoutes(ctx.nitro))

  return async function () {
    await stopServer()
  }
}

export default setup
