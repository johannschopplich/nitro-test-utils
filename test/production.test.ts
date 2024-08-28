import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '../src/e2e'

describe('production', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('fixture2', import.meta.url)),
    mode: 'production',
  })

  it('should respond from production server bundle', async () => {
    const { data } = await $fetch('/')
    expect(data).toBe('Hello, production build!')
  })
})
