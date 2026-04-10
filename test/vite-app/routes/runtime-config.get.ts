import { defineHandler } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

export default defineHandler(() => useRuntimeConfig())
