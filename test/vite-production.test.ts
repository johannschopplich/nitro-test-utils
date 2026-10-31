import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $serverFetch, setup } from '../src'

describe('vite + nitro production build', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'vite-app'),
    mode: 'production',
  })

  it('builds the app with Vite', async () => {
    const { data } = await $serverFetch('/builder')
    expect(data).toEqual({ builder: 'vite' })
  })
})
