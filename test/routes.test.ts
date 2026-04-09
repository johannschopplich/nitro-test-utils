import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $fetchRaw, createNitroFetch, createNitroSession, injectServerUrl, setup } from '../src/e2e'

describe('routes', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'basic-app'),
  })

  it('returns health check response', async () => {
    const { data } = await $fetchRaw('/api/health')
    expect(data).toMatchInlineSnapshot(`
      {
        "ok": true,
      }
    `)
  })

  it('exposes environment variables and build flags', async () => {
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

  it('returns structured error response', async () => {
    const { data, status } = await $fetchRaw('/api/error')
    expect(status).toBe(422)
    expect(data).toMatchObject({
      error: true,
      status: 422,
      statusText: 'Unprocessable Entity',
      message: 'Validation failed',
    })
  })

  it('returns 404 for non-existent route', async () => {
    const { status } = await $fetchRaw('/api/non-existent')
    expect(status).toBe(404)
  })

  it('echoes POST body', async () => {
    const { data, status } = await $fetchRaw('/api/echo', {
      method: 'POST',
      body: { hello: 'world' },
    })
    expect(status).toBe(200)
    expect(data).toEqual({ hello: 'world' })
  })

  it('fetches through a custom ofetch instance', async () => {
    const $fetch = createNitroFetch()
    const data = await $fetch('/api/health')
    expect(data).toEqual({ ok: true })
  })

  it('provides the running server URL', () => {
    const url = injectServerUrl()
    expect(url).toMatch(/^https?:\/\/.+/)
  })

  describe('cookies', () => {
    it('persists cookies across requests', async () => {
      const session = createNitroSession()
      await session.$fetch('/api/login', { method: 'POST' })
      const profile = await session.$fetch('/api/profile')
      expect(profile).toEqual({ user: 'authenticated' })
    })

    it('clears cookies', async () => {
      const session = createNitroSession()
      await session.$fetch('/api/login', { method: 'POST' })
      session.clearCookies()
      const response = await session.$fetch.raw('/api/profile')
      expect(response.status).toBe(401)
    })

    it('exposes cookies for assertions', async () => {
      const session = createNitroSession()
      await session.$fetch('/api/login', { method: 'POST' })
      expect(session.cookies.get('session')).toBe('abc123')
    })
  })
})
