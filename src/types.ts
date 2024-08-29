import type { Listener } from 'listhen'
import type { Nitro, NitroOptions } from 'nitropack'

/**
 * Options for the Nitro test context.
 */
export interface TestOptions {
  /**
   * Path to the directory with a Nitro app to be put under test.
   *
   * @example
   * fileURLToPath(new URL('backend', import.meta.url))
   *
   * @default process.cwd()
   */
  rootDir?: string

  /**
   * Whether to build the Nitro server in development mode or for production.
   *
   * @remarks
   * The Nitro build preset is automatically set based on this option. If this is set to `development`, the preset `nitro-dev` will be used. Otherwise, Nitro will is built with the `node` preset.
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
  isGlobal: boolean
  isDev: boolean
  nitro: Nitro
  server?: Listener
}
