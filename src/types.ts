import type { Listener } from 'listhen'
import type { Nitro, NitroOptions } from 'nitropack'

export interface NitroTestContext {
  preset: NitroOptions['preset']
  nitro: Nitro
  server?: Listener
  isDev: boolean
}

export interface SetupOptions {
  /**
   * The root directory of the Nitro project to test against.
   *
   * @example
   * fileURLToPath(new URL('fixture', import.meta.url))
   *
   * @default process.cwd()
   */
  rootDir?: string
}
