import { describe, expect, it } from 'vitest'
import { $fetch } from '../src/e2e'

describe('routes', () => {
  it('responds with 200 status code', async () => {
    const { body } = await $fetch('/api/hello')
    expect(body).toMatchInlineSnapshot(`
      {
        "ok": true,
      }
    `)
  })
})
