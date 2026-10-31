/* eslint-disable node/prefer-global/process */
import { defineHandler } from 'nitro/h3'

export default defineHandler(() => ({
  isDev: import.meta.dev,
  envName: import.meta.envName,
  process: {
    TEST_FOO: process.env.TEST_FOO,
    NODE_ENV: process.env.NODE_ENV,
  },
}))
