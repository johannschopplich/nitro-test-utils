import { describe, expect, it } from 'vitest'
import { $serverFetch } from '../../src'

describe('global setup: shared server', () => {
  it('responds from the global app without a setup call', async () => {
    const { data } = await $serverFetch('/api/health')
    expect(data).toEqual({ ok: true })
  })
})
