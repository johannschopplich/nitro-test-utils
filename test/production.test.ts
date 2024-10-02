import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetchRaw, setup } from '../src/e2e'

describe('production', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('fixture2', import.meta.url)),
    mode: 'production',
  })

  it('should respond from production server build', async () => {
    const { data } = await $fetchRaw('/')
    expect(data).toBe('Hello, production build!')
  })
})
