import type { ChildProcess } from 'node:child_process'
import type { Nitro, NitroOptions } from 'nitropack'

/**
 * Options for the test context.
 */
export interface TestOptions {
  /**
   * Path th a directory with a Nitro app to be put under test.
   *
   * @example
   * fileURLToPath(new URL('fixture', import.meta.url))
   *
   * @default process.cwd()
   */
  rootDir: string
  dev: boolean
  /**
   * The preset to use for the Nitro project.
   */
  preset: NitroOptions['preset']
}

/**
 * The context created before all tests.
 */
export interface TestContext {
  options: TestOptions
  nitro: Nitro
  url?: string
  serverProcess?: ChildProcess
}
