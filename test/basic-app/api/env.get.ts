/* eslint-disable node/prefer-global/process */
import { defineHandler } from 'nitro'

export default defineHandler(() => ({
  isDev: import.meta.dev,
  isTest: import.meta.test,
  process: {
    TEST_FOO: process.env.TEST_FOO,
    NODE_ENV: process.env.NODE_ENV,
  },
}))
