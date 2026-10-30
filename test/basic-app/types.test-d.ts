import { $fetchRaw, listRoutes } from 'nitro-test-utils'
import { describe, expectTypeOf, it } from 'vitest'

describe('$fetchRaw types', () => {
  it('types data from the explicit generic', async () => {
    const response = await $fetchRaw<{ custom: string }>('/api/health')
    expectTypeOf(response.data).toEqualTypeOf<{ custom: string } | undefined>()
  })

  it('types data as a string with responseType text', async () => {
    const response = await $fetchRaw('/api/health', { responseType: 'text' })
    expectTypeOf(response.data).toEqualTypeOf<string | undefined>()
  })

  it('falls back to `any` without a generic', async () => {
    const response = await $fetchRaw('/api/health')
    expectTypeOf(response.data).toBeAny()
  })
})

describe('listRoutes types', () => {
  it('returns the documented shape', () => {
    expectTypeOf(listRoutes).returns.toEqualTypeOf<{ route: string, method?: string }[]>()
  })
})
