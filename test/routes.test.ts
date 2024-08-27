import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '../src/e2e'

describe('routes', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('fixture', import.meta.url)),
  })

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
        "isDev": true,
        "isTest": true,
        "process": {
          "NODE_ENV": "development",
          "TEST_FOO": "bar",
        },
      }
    `)
  })
})
