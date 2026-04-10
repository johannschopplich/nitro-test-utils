import { describe, expect, it } from 'vitest'
import { $fetchRaw, injectServerUrl } from '../../src/e2e'

describe('global setup: shared server', () => {
  it('exposes the server URL via vitest.inject', () => {
    expect(injectServerUrl()).toMatch(/^https?:\/\/.+/)
  })

  it('reuses the same nitro server across test files', async () => {
    const { data } = await $fetchRaw('/api/health')
    expect(data).toEqual({ ok: true })
  })
})
