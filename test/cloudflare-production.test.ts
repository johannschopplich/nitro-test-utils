import { randomUUID } from 'node:crypto'
import * as path from 'node:path'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { $serverFetch, setup } from '../src'
import { injectTestContext } from '../src/context'

describe('cloudflare production', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'cloudflare-app'),
    mode: 'production',
    preset: 'cloudflare-module',
  })

  it('exposes the DB and KV bindings', async () => {
    const { data } = await $serverFetch('/api/bindings')
    expect(data?.hasEnv).toBe(true)
    expect(data?.bindings).toContain('DB')
    expect(data?.bindings).toContain('KV')
  })

  it('reads and writes to KV', async () => {
    const value = randomUUID()
    await $serverFetch('/api/kv', {
      method: 'POST',
      body: { key: 'production-key', value },
    })

    const { data } = await $serverFetch('/api/kv?key=production-key')
    expect(data?.value).toBe(value)
  })

  it('reaches wrangler while global fetch is stubbed', async () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('Stubbed fetch')
    })
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })

    const { data } = await $serverFetch('/api/bindings')
    expect(data?.hasEnv).toBe(true)
  })

  it('forwards a path that starts with // to wrangler', async () => {
    const previewFetch = injectTestContext()!.preview!.fetch
    const response = await previewFetch(new Request('http://nitro.test//api/bindings'))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringContaining('//api/bindings'),
    })
  })
})
