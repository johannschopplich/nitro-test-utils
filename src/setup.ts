import process from 'node:process'
import type { GlobalSetupContext } from 'vitest/node'
import type { NitroOptions } from 'nitropack'
import type { NitroInlineConfig } from './config'
import { setupContext } from './index'

type NitroSetupContext = GlobalSetupContext & {
  config: { nitro?: NitroInlineConfig }
}

// Setup shared Nitro instance
// See https://vitest.dev/config/#globalsetup
export default async function ({ config, provide }: NitroSetupContext) {
  const preset: NitroOptions['preset'] = config.nitro?.mode === 'production' ? 'node' : 'nitro-dev'

  // Serve or build Nitro
  const ctx = await setupContext({
    preset,
    rootDir: config.nitro?.rootDir || config.root || process.cwd(),
  })

  // Global setup is run in a different global scope, so tests don't have access
  // to variables defined here. We need to expose the server URL for tests.
  provide('nitroServerUrl', ctx.server!.url)

  return async function () {
    // Close the server if it was started
    if (ctx.server)
      await ctx.server.close()
    // End Nitro server after all tests
    if (ctx.nitro)
      await ctx.nitro.close()
  }
}
