import { describe, expect, it } from 'vitest'
import { $serverFetch, injectNitroFetch } from '../../src'

describe('global setup: shared server', () => {
  it('exposes an in-process request dispatcher', async () => {
    const nitroFetch = injectNitroFetch()
    const response = await nitroFetch(new Request('http://nitro.test/api/health'))

    expect(response.status).toBe(200)
  })

  it('reuses the same nitro server across test files', async () => {
    const { data } = await $serverFetch('/api/health')
    expect(data).toEqual({ ok: true })
  })
})
