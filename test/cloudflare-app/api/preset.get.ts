import { defineHandler } from 'nitro/h3'

export default defineHandler(() => ({
  preset: import.meta.preset,
}))
