import type { Nitro } from 'nitro/types'

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

  /**
   * Nitro preset to use for the test server.
   *
   * In development mode, Nitro automatically resolves deployment presets
   * (e.g. `cloudflare-module`) to their dev counterpart (e.g. `cloudflare-dev`),
   * which provides local bindings emulation via `getPlatformProxy()`.
   *
   * In production mode, only Node.js-compatible presets are supported.
   * Attempting to use a non-Node preset in production mode will throw an error.
   *
   * @default Determined by `mode`: `'nitro-dev'` for development, `'node-middleware'` for production.
   */
  preset?: string
}

/**
 * The context created before all tests.
 */
export interface NitroTestContext {
  options: Required<Pick<NitroTestOptions, 'rootDir' | 'mode'>> & Pick<NitroTestOptions, 'preset'>
  isGlobal: boolean
  isDev: boolean
  nitro: Nitro
  /**
   * In-process request dispatcher. Takes a Web `Request` and returns the Nitro app's response
   * without going through a real HTTP listener.
   */
  fetch?: (request: Request) => Response | Promise<Response>
}
