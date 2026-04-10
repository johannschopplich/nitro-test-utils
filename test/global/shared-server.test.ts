import { describe, expect, it } from 'vitest'
import { $fetchRaw, injectNitroFetch } from '../../src/e2e'

describe('global setup: shared server', () => {
  it('exposes an in-process request dispatcher', async () => {
    const nitroFetch = injectNitroFetch()
    const response = await nitroFetch(new Request('http://nitro.test/api/health'))

    expect(response.status).toBe(200)
  })

  it('reuses the same nitro server across test files', async () => {
    const { data } = await $fetchRaw('/api/health')
    expect(data).toEqual({ ok: true })
  })
})
