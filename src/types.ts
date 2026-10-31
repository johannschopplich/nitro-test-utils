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
   * Whether to run the Nitro app in development mode or to test its production build.
   *
   * @default 'development'
   */
  mode?: 'development' | 'production'

  /**
   * Nitro preset to use for the test server.
   *
   * In development mode, Nitro resolves deployment presets (e.g. `cloudflare-module`) to
   * their dev counterpart (e.g. `cloudflare-dev`), which runs the app in the miniflare
   * runner with local bindings.
   *
   * In production mode, the app is built with this preset. `standard` and `node-server` load
   * in-process. `cloudflare-module` and `cloudflare-durable` run in `wrangler dev`, which must be
   * installed, and only per test suite, not in global mode. Other presets are rejected.
   *
   * @default Determined by `mode`: `'nitro-dev'` for development, `'standard'` for production.
   */
  preset?: string
}
