import type { Nitro, NitroOptions } from 'nitropack'
import type { Listener } from 'listhen'

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
  isDev: boolean
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
  server?: Listener
}
