import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetchRaw, setup } from '../src/e2e'

describe('routes', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('fixture', import.meta.url)),
  })

  it('should respond with 200 status code', async () => {
    const { data } = await $fetchRaw('/api/health')
    expect(data).toMatchInlineSnapshot(`
      {
        "ok": true,
      }
    `)
  })

  it('should return custom environment variables', async () => {
    const { data } = await $fetchRaw('/api/env')
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
