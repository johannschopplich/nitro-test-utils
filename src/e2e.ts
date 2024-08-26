import { ofetch } from 'ofetch'
import type { FetchOptions, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'
import { build, copyPublicAssets, createDevServer, prepare, prerender } from 'nitropack'
import { createTestContext, setTestContext, useTestContext } from './context'
import type { TestOptions } from './types'
import { startServer, stopServer } from './server'

export interface TestFetchResponse<T> extends FetchResponse<T> {
  /** Alias for `response._data` */
  data?: T
}

export async function $fetch<T = any, R extends ResponseType = 'json'>(
  path: string,
  options?: FetchOptions<R>,
) {
  const ctx = useTestContext()

  if (!ctx.url) {
    throw new Error('No server URL is available.')
  }

  const localFetch = ofetch.create({
    baseURL: ctx.url,
    ignoreResponseError: true,
    redirect: 'manual',
    headers: {
      accept: 'application/json',
    },
  })

  const response = await localFetch.raw<T, R>(
    path,
    options,
  )

  Object.defineProperty(response, 'data', {
    get() {
      return response._data
    },
  })

  return response as TestFetchResponse<MappedResponseType<R, T>>
}

/**
 * Setup options for the test context.
 *
 * @example
 * import { setup } from 'nitro-test-utils'
 *
 * await setup({
 *  rootDir: fileURLToPath(new URL('fixture', import.meta.url)),
 * })
 *
 */
export async function setup(options: Partial<TestOptions> = {}) {
  const ctx = await createTestContext(options)

  const vitest = await import('vitest')

  vitest.beforeAll(async () => {
    // Build
    if (!ctx.options.dev) {
      await prepare(ctx.nitro)
      await copyPublicAssets(ctx.nitro)
      await prerender(ctx.nitro)
      await build(ctx.nitro)
    }

    await startServer()
  })

  vitest.afterAll(async () => {
    if (ctx.serverProcess) {
      await stopServer()
    }

    setTestContext(undefined)
  })
}
