import { $serverFetch } from 'nitro-test-utils'
import { describe, expectTypeOf, it } from 'vitest'

describe('$serverFetch types', () => {
  it('types data from the explicit generic', async () => {
    const response = await $serverFetch<{ custom: string }>('/api/health')
    expectTypeOf(response.data).toEqualTypeOf<{ custom: string } | undefined>()
  })

  it('types data as a string with responseType text', async () => {
    const response = await $serverFetch('/api/health', { responseType: 'text' })
    expectTypeOf(response.data).toEqualTypeOf<string | undefined>()
  })

  it('falls back to `any` without a generic', async () => {
    const response = await $serverFetch('/api/health')
    expectTypeOf(response.data).toBeAny()
  })
})
