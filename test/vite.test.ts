import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $fetchRaw, setup } from '../src/e2e'

describe('vite + nitro', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'vite-app'),
  })

  it('responds with 200 status code', async () => {
    const { data } = await $fetchRaw('/health')
    expect(data).toEqual({ ok: true })
  })

  it('returns 404 for non-existent route', async () => {
    const { status } = await $fetchRaw('/non-existent')
    expect(status).toBe(404)
  })
})
