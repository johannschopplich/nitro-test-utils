import type { GlobalSetupContext } from 'vitest/node'
import { setupContext, startServer } from './index'

// Setup shared Nitro instance
// See https://vitest.dev/config/#globalsetup
export default async function ({ config, provide }: GlobalSetupContext) {
  // Build Nitro
  const ctx = await setupContext({
    // @ts-expect-error: Nitro config is not defined in the Vitest user config
    rootDir: config.nitro?.rootDir || config.root,
  })

  // Start the server before all tests
  const close = await startServer(ctx)

  // Global setup is run in a different global scope, so tests don't have access
  // to variables defined here. We need to expose the server URL for tests.
  provide('nitroServerUrl', ctx.server!.url)

  return async function () {
    // Close the server after all tests
    await close()
  }
}
