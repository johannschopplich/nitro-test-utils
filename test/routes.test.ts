import * as path from 'node:path'
import { serverFetch } from 'nitro'
import { describe, expect, it } from 'vitest'
import { $serverFetch, createNitroSession, listRoutes, setup } from '../src'

describe('routes', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'basic-app'),
  })

  it('returns health check response', async () => {
    const { data } = await $serverFetch('/api/health')
    expect(data).toMatchInlineSnapshot(`
      {
        "ok": true,
      }
    `)
  })

  it('exposes environment variables and build flags', async () => {
    const { data } = await $serverFetch('/api/env')
    expect(data).toMatchInlineSnapshot(`
      {
        "envName": "test",
        "isDev": true,
        "process": {
          "NODE_ENV": "test",
          "TEST_FOO": "bar",
        },
      }
    `)
  })

  it('returns structured error response', async () => {
    const { data, status } = await $serverFetch('/api/error')
    expect(status).toBe(422)
    expect(data).toMatchObject({
      error: true,
      status: 422,
      statusText: 'Unprocessable Entity',
      message: 'Validation failed',
    })
  })

  it('returns 404 for non-existent route', async () => {
    const { status } = await $serverFetch('/api/non-existent')
    expect(status).toBe(404)
  })

  it('echoes POST body', async () => {
    const { data, status } = await $serverFetch('/api/echo', {
      method: 'POST',
      body: { hello: 'world' },
    })
    expect(status).toBe(200)
    expect(data).toEqual({ hello: 'world' })
  })

  it('answers serverFetch from nitro', async () => {
    const response = await serverFetch('/api/health')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  describe('introspection', () => {
    it('lists every user-defined route from the scanned handlers', () => {
      const routes = listRoutes()

      expect(routes).toEqual(
        expect.arrayContaining([
          { route: '/api/echo', method: 'post' },
          { route: '/api/env', method: 'get' },
          { route: '/api/error', method: 'get' },
          { route: '/api/health', method: 'get' },
          { route: '/api/login', method: 'post' },
          { route: '/api/profile', method: 'get' },
          { route: '/api/runtime-config', method: 'get' },
        ]),
      )
    })

    it('filters out nitro-internal routes', () => {
      const routes = listRoutes()

      for (const { route } of routes) {
        expect(route.startsWith('/_')).toBe(false)
        expect(route.startsWith('/api/_')).toBe(false)
      }
    })
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

    it.each(['max-age', 'expires'])('drops a cookie the server expires through %s', async (via) => {
      const session = createNitroSession()
      await session.$fetch('/api/login', { method: 'POST' })
      await session.$fetch('/api/logout', {
        method: 'POST',
        query: { via },
      })

      expect(session.cookies.has('session')).toBe(false)
    })

    it('keeps a cookie whose Max-Age outlives a past Expires', async () => {
      const session = createNitroSession()
      await session.$fetch('/api/logout', {
        method: 'POST',
        query: { via: 'max-age-over-expires' },
      })

      expect(session.cookies.get('session')).toBe('fresh')
    })

    it('skips a Set-Cookie header that cookie-es rejects', async () => {
      const session = createNitroSession()
      await session.$fetch('/api/visit', { method: 'POST' })

      expect(session.cookies.get('visited')).toBe('yes')
    })
  })
})
