import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $serverFetch, setup } from '../src'

describe('static assets', async () => {
  await setup({
    rootDir: path.resolve(import.meta.dirname, 'static-app'),
    mode: 'production',
  })

  it('serves public assets under the baseURL', async () => {
    const { data, status } = await $serverFetch('/app/hello.txt', { responseType: 'text' })
    expect(status).toBe(200)
    expect(data).toBe('Hello, static asset!\n')
  })
})
