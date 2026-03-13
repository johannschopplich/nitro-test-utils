import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $fetchRaw, createNitroFetch, createNitroSession, injectServerUrl, setup } from '../src/e2e'

describe('routes', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'basic-app'),
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
          "NODE_ENV": "test",
          "TEST_FOO": "bar",
        },
      }
    `)
  })

  it('should return 422 for error route', async () => {
    const { data, status } = await $fetchRaw('/api/error')
    expect(status).toBe(422)
    expect(data).toMatchObject({
      error: true,
      status: 422,
      statusText: 'Unprocessable Entity',
      message: 'Validation failed',
    })
  })

  it('should return 404 for non-existent route', async () => {
    const { status } = await $fetchRaw('/api/non-existent')
    expect(status).toBe(404)
  })

  it('should echo POST body', async () => {
    const { data, status } = await $fetchRaw('/api/echo', {
      method: 'POST',
      body: { hello: 'world' },
    })
    expect(status).toBe(200)
    expect(data).toEqual({ hello: 'world' })
  })

  it('should create a custom fetch instance with createNitroFetch', async () => {
    const $fetch = createNitroFetch()
    const data = await $fetch('/api/health')
    expect(data).toEqual({ ok: true })
  })

  it('should return server URL from injectServerUrl', () => {
    const url = injectServerUrl()
    expect(url).toMatch(/^https?:\/\/.+/)
  })

  describe('cookies', () => {
    it('should persist cookies across requests', async () => {
      const session = createNitroSession()
      await session.$fetch('/api/login', { method: 'POST' })
      const profile = await session.$fetch('/api/profile')
      expect(profile).toEqual({ user: 'authenticated' })
    })

    it('should clear cookies', async () => {
      const session = createNitroSession()
      await session.$fetch('/api/login', { method: 'POST' })
      session.clearCookies()
      const response = await session.$fetch.raw('/api/profile')
      expect(response.status).toBe(401)
    })

    it('should expose cookies for assertions', async () => {
      const session = createNitroSession()
      await session.$fetch('/api/login', { method: 'POST' })
      expect(session.cookies.get('session')).toBe('abc123')
    })
  })
})
