import { defineHandler } from 'nitro/h3'
// @ts-expect-error: Resolved by the `builder` plugin in `vite.config.ts`.
import builder from 'virtual:builder'

export default defineHandler(() => ({ builder }))
