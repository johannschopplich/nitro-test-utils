/* eslint-disable node/prefer-global/process */
import { defineHandler } from 'nitro/h3'

export default defineHandler(() => ({
  productionOnly: process.env.TEST_PRODUCTION_ONLY ?? null,
}))
