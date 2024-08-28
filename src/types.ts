import type { Listener } from 'listhen'
import type { Nitro, NitroOptions } from 'nitropack'

/**
 * Options for the Nitro test context.
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
  rootDir?: string

  /**
   * Whether to build the Nitro server in development mode or for production.
   *
   * @remarks
   * The Nitro build preset will be set to `nitro-dev` if this is set to 'development'. Otherwise, it will be set to `node`.
   *
   * @default 'development'
   */
  mode?: 'development' | 'production'
}

/**
 * The context created before all tests.
 */
export interface TestContext {
  options: Required<TestOptions>
  isDev: boolean
  preset: NitroOptions['preset']
  nitro: Nitro
  server?: Listener
}
