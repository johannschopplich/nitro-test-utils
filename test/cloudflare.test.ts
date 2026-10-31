import { randomUUID } from 'node:crypto'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $serverFetch, setup } from '../src'

describe('cloudflare bindings', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'cloudflare-app'),
    preset: 'cloudflare-module',
  })

  it('has cloudflare bindings available', async () => {
    const { data } = await $serverFetch('/api/bindings')
    expect(data?.hasEnv).toBe(true)
    expect(data?.bindings).toContain('DB')
    expect(data?.bindings).toContain('KV')
  })

  it('reads and writes to KV', async () => {
    const value = randomUUID()
    await $serverFetch('/api/kv', {
      method: 'POST',
      body: { key: 'test-key', value },
    })

    const { data } = await $serverFetch('/api/kv?key=test-key')
    if (!data || 'error' in data) {
      throw new Error(`Expected success response, got ${JSON.stringify(data)}`)
    }
    expect(data.value).toBe(value)
  })

  it('reads and writes to D1', async () => {
    const { data: insertResult } = await $serverFetch('/api/d1-seed', {
      method: 'POST',
      body: { name: 'item-1' },
    })
    expect(insertResult?.ok).toBe(true)

    const { data: listResult } = await $serverFetch('/api/d1-list')
    expect(listResult?.items).toContainEqual(
      expect.objectContaining({ name: 'item-1' }),
    )
  })
})
