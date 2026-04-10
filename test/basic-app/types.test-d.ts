/// <reference path="./node_modules/.nitro/types/nitro.d.ts" />

import { $fetchRaw, listRoutes } from 'nitro-test-utils'
import { describe, expectTypeOf, it } from 'vitest'

describe('$fetchRaw types', () => {
  it('narrows GET response to the handler return type', async () => {
    const response = await $fetchRaw('/api/health')
    expectTypeOf(response.data).toEqualTypeOf<{ ok: boolean } | undefined>()
  })

  it('narrows POST response when method is specified', async () => {
    const response = await $fetchRaw('/api/login', { method: 'POST' })
    expectTypeOf(response.data).toEqualTypeOf<{ loggedIn: boolean } | undefined>()
  })

  it('accepts uppercase and lowercase method aliases', async () => {
    const response = await $fetchRaw('/api/login', { method: 'post' })
    expectTypeOf(response.data).toEqualTypeOf<{ loggedIn: boolean } | undefined>()
  })

  it('lets an explicit generic override the inferred response type', async () => {
    const response = await $fetchRaw<{ custom: string }>('/api/health')
    expectTypeOf(response.data).toEqualTypeOf<{ custom: string } | undefined>()
  })

  it('falls back to `unknown` for non-augmented routes', async () => {
    const response = await $fetchRaw('/api/does-not-exist')
    expectTypeOf(response.data).toEqualTypeOf<unknown>()
  })
})

describe('listRoutes types', () => {
  it('returns the documented shape', () => {
    expectTypeOf(listRoutes).returns.toEqualTypeOf<{ route: string, method?: string }[]>()
  })
})
