import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $fetchRaw, setup } from '../src/e2e'

describe('production', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'production-app'),
    mode: 'production',
  })

  it('should respond from production server build', async () => {
    const { data } = await $fetchRaw('/')
    expect(data).toBe('Hello, production build!')
  })
})
