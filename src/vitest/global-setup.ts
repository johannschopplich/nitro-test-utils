import type { TestProject } from 'vitest/node'
import type { ResolvedNitroTestConfig } from '../config'
import * as path from 'node:path'
import process from 'node:process'
import { snapshotDevBuildInfo } from '../context'

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

  if (global.mode === 'production')
    return

  // Restored here, since Vitest ends the worker that runs the global app without stopping it. The
  // worker may still run at this point, so the test's record is the one with the `test` env name.
  return snapshotDevBuildInfo(path.resolve(global.rootDir ?? process.cwd()), record => record.envName === 'test')
}

export default globalSetup
