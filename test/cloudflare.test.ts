/// <reference path="./cloudflare-app/node_modules/.nitro/types/nitro.d.ts" />

import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $fetchRaw, setup } from '../src/e2e'

describe('cloudflare bindings', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'cloudflare-app'),
    preset: 'cloudflare-module',
  })

  it('has cloudflare bindings available', async () => {
    const { data } = await $fetchRaw('/api/bindings')
    expect(data?.hasEnv).toBe(true)
    expect(data?.bindings).toContain('DB')
    expect(data?.bindings).toContain('KV')
  })

  it('reads and writes to KV', async () => {
    await $fetchRaw('/api/kv', {
      method: 'POST',
      body: { key: 'test-key', value: 'hello' },
    })

    const { data } = await $fetchRaw('/api/kv?key=test-key')
    if (!data || 'error' in data) {
      throw new Error(`Expected success response, got ${JSON.stringify(data)}`)
    }
    expect(data.value).toBe('hello')
  })

  it('reads and writes to D1', async () => {
    const { data: insertResult } = await $fetchRaw('/api/d1-seed', {
      method: 'POST',
      body: { name: 'item-1' },
    })
    expect(insertResult?.ok).toBe(true)

    const { data: listResult } = await $fetchRaw('/api/d1-list')
    expect(listResult?.items).toContainEqual(
      expect.objectContaining({ name: 'item-1' }),
    )
  })
})
