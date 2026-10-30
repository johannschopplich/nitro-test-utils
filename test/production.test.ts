import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $fetchRaw, setup } from '../src/e2e'

describe('production', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'production-app'),
    mode: 'production',
  })

  it('responds with the index route', async () => {
    const { data } = await $fetchRaw('/')
    expect(data).toBe('Hello, production build!')
  })

  it('sets import.meta.test to true', async () => {
    const { data } = await $fetchRaw('/env')
    expect(data).toEqual({ isTest: true })
  })
})
