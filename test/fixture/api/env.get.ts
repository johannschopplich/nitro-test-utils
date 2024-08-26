/* eslint-disable node/prefer-global/process */
export default defineEventHandler(() => ({
  isDev: import.meta.dev,
  process: {
    TEST_FOO: process.env.TEST_FOO,
    NODE_ENV: process.env.NODE_ENV,
  },
}))
