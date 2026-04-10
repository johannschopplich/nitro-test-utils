import { describe, expect, it } from 'vitest'
import { $fetchRaw } from '../../src/e2e'

describe('global setup: dynamic env vars', () => {
  it('propagates process.env.NITRO_* set in a user globalSetup into runtime config', async () => {
    const { data } = await $fetchRaw('/api/runtime-config')
    expect(data).toEqual({ dynamicValue: 'injected-at-runtime' })
  })
})
