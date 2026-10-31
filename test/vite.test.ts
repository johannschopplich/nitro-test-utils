import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $serverFetch, setup } from '../src'

describe('vite + nitro', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'vite-app'),
  })

  it('responds with 200 status code', async () => {
    const { data } = await $serverFetch('/health')
    expect(data).toEqual({ ok: true })
  })

  it('returns 404 for non-existent route', async () => {
    const { status } = await $serverFetch('/non-existent')
    expect(status).toBe(404)
  })

  it('resolves the declared runtime config through the builder virtual module', async () => {
    const { data } = await $serverFetch<Record<string, any>>('/runtime-config')
    expect(data?.app).toHaveProperty('baseURL')
    expect(data).toHaveProperty('dynamicValue')
  })
})
