import { describe, expect, it } from 'vitest'
import { $fetch } from '../src/e2e'

describe('routes', () => {
  it('responds with 200 status code', async () => {
    const { data } = await $fetch('/api/health')
    expect(data).toMatchInlineSnapshot(`
      {
        "ok": true,
      }
    `)
  })

  it('returns custom environment variable', async () => {
    const { data } = await $fetch('/api/env')
    expect(data).toMatchInlineSnapshot(`
      {
        "NODE_ENV": "development",
        "TEST_FOO": "bar",
      }
    `)
  })
})
