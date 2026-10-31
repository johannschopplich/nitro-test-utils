import * as path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { $serverFetch, setup } from '../src'

describe('vite + nitro production build', async () => {
  // The CI matrix's `NITRO_BUILDER` would take precedence over Nitro picking Vite.
  vi.stubEnv('NITRO_BUILDER', undefined)
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  await setup({
    rootDir: path.resolve(import.meta.dirname, 'vite-app'),
    mode: 'production',
  })

  it('builds the app with Vite', async () => {
    const { data } = await $serverFetch('/builder')
    expect(data).toEqual({ builder: 'vite' })
  })
})
