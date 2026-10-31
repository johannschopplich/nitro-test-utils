import { describe, expect, it } from 'vitest'
import { $serverFetch } from '../../src'

describe('global setup: dynamic env vars', () => {
  it('lets process.env.NITRO_* from a user globalSetup override .env.test in runtime config', async () => {
    const { data } = await $serverFetch<Record<string, any>>('/api/runtime-config')

    expect(data?.dynamicValue).toBe('injected-at-runtime')
    expect(data?.fromTestConfig).toBe('applied')
    expect(data?.app).toHaveProperty('baseURL')
  })
})
