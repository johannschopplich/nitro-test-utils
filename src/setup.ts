import process from 'node:process'
import type { GlobalSetupContext } from 'vitest/node'
import type { NitroInlineConfig } from './config'
import { createTestContext } from './context'
import { startServer, stopServer } from './server'

type NitroSetupContext = GlobalSetupContext & {
  config: { nitro?: NitroInlineConfig }
}

declare module 'vitest' {
  export interface ProvidedContext {
    server?: {
      url: string
    }
  }
}

// Setup shared Nitro instance
// See https://vitest.dev/config/#globalsetup
export default async function ({ config, provide }: NitroSetupContext) {
  if (config.nitro?.global) {
    const ctx = await createTestContext({
      rootDir: config.nitro?.global?.rootDir || config.root || process.cwd(),
      mode: config.nitro?.global?.mode,
    })

    await startServer()

    // Global setup is run in a different global scope, so tests don't have access
    // to variables defined here. We need to expose the server URL for tests.
    provide('server', { url: ctx.server!.url })
  }

  return async function () {
    if (config.nitro?.global) {
      await stopServer()
    }
  }
}
