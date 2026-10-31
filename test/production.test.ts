import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $fetchRaw, setup } from '../src'

describe('production', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'production-app'),
    mode: 'production',
  })

  it('responds with the index route', async () => {
    const { data } = await $fetchRaw('/')
    expect(data).toBe('Hello, production build!')
  })

  it('sets import.meta.envName to test', async () => {
    const { data } = await $fetchRaw('/env')
    expect(data).toEqual({ envName: 'test' })
  })
})
