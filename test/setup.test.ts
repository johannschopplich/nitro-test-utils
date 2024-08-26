import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '../src/e2e'

describe('setup', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('fixture2', import.meta.url)),
    preset: 'node-server',
  })

  it('should load fixture2', async () => {
    const { data } = await $fetch('/')

    expect(data).toBe('Load fixture2')
  })
})
