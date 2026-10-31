import { describe, expect, it } from 'vitest'
import { $serverFetch } from '../../src'

describe('global setup: dynamic env vars', () => {
  it('propagates process.env.NITRO_* set in a user globalSetup into runtime config', async () => {
    const { data } = await $serverFetch<Record<string, any>>('/api/runtime-config')

    expect(data?.dynamicValue).toBe('injected-at-runtime')
    expect(data?.fromTestConfig).toBe('applied')
    expect(data?.app).toHaveProperty('baseURL')
  })
})
