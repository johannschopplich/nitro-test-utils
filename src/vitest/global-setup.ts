import type { TestProject } from 'vitest/node'
import type { ResolvedNitroTestConfig } from '../config'

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
async function globalSetup(project: GlobalSetupContextWithNitro): Promise<void> {
  if (!project.config.nitro.global)
    return

  project.provide('nitroTestConfig', project.config.nitro)
}

export default globalSetup
