import { defineHandler } from 'nitro/h3'

export default defineHandler(() => ({
  envName: import.meta.envName,
}))
