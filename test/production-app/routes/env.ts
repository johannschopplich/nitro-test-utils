import { defineHandler } from 'nitro/h3'

export default defineHandler(() => ({
  isTest: import.meta.test,
}))
