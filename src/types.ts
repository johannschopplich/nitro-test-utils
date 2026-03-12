import type { Nitro } from 'nitro/types'

/**
 * A lightweight handle to the running test server.
 */
export interface NitroTestServer {
  url: string
  close: () => Promise<void>
}

/**
 * Options for the Nitro test context.
 */
export interface NitroTestOptions {
  /**
   * Path to the directory with a Nitro app to be put under test.
   *
   * @example
   * resolve(import.meta.dirname, 'backend')
   *
   * @default process.cwd()
   */
  rootDir?: string

  /**
   * Whether to build the Nitro server in development mode or for production.
   *
   * @remarks
   * The Nitro build preset is automatically set based on this option. If this is set to `development`, the preset `nitro-dev` will be used. Otherwise, Nitro is built with the `node-middleware` preset.
   *
   * @default 'development'
   */
  mode?: 'development' | 'production'
}

/**
 * The context created before all tests.
 */
export interface NitroTestContext {
  options: Required<NitroTestOptions>
  isGlobal: boolean
  isDev: boolean
  nitro: Nitro
  server?: NitroTestServer
}
