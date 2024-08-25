import type { Listener } from 'listhen'
import type { Nitro, NitroOptions } from 'nitropack'

export interface NitroTestContext {
  preset: NitroOptions['preset']
  nitro: Nitro
  server?: Listener
  isDev: boolean
}
