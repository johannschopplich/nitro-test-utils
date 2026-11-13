import type { TestProject } from 'vitest/node'
import type { ResolvedNitroTestConfig } from '../config'
import { snapshotDevBuildInfo } from '../server'

type GlobalSetupContextWithNitro = TestProject & {
  config: { nitro: ResolvedNitroTestConfig }
}

declare module 'vitest' {
  export interface ProvidedContext {
    nitroTestConfig?: ResolvedNitroTestConfig
  }
}

/**
 * Runs in the main Vitest process and forwards the resolved test config to the worker
 * via `provide`/`inject`. The Nitro app itself is initialized in `worker-setup.ts`.
 */
async function globalSetup(project: GlobalSetupContextWithNitro): Promise<(() => void) | undefined> {
  const { global } = project.config.nitro
  if (!global)
    return

  project.provide('nitroTestConfig', project.config.nitro)

  // Restored here, since Vitest ends the worker that runs the global app without stopping it.
  return snapshotDevBuildInfo(global.rootDir)
}

export default globalSetup
