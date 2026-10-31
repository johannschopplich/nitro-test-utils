import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $serverFetch, setup } from '../src'

describe('production', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'production-app'),
    mode: 'production',
  })

  it('responds with the index route', async () => {
    const { data } = await $serverFetch('/')
    expect(data).toBe('Hello, production build!')
  })

  it('sets import.meta.envName to test', async () => {
    const { data } = await $serverFetch('/env')
    expect(data).toEqual({ envName: 'test' })
  })
})
