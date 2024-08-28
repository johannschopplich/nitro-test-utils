import { ofetch } from 'ofetch'
import type { FetchOptions, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'
import { clearTestContext, createTestContext, injectTestContext } from './context'
import type { TestOptions } from './types'
import { startServer, stopServer } from './server'

export interface TestFetchResponse<T> extends FetchResponse<T> {
  /** Alias for `response._data` */
  data?: T
}

declare module 'vitest' {
  export interface ProvidedContext {
    server?: {
      url: string
    }
  }
}

export async function $fetch<T = any, R extends ResponseType = 'json'>(
  path: string,
  options?: FetchOptions<R>,
) {
  let serverUrl = injectTestContext()?.server?.url

  if (!serverUrl) {
    const vitest = await import('vitest')
    serverUrl = vitest.inject('server')?.url
  }

  if (!serverUrl) {
    throw new Error('Nitro server is not running.')
  }

  const localFetch = ofetch.create({
    baseURL: serverUrl,
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
 * Setup options for the Nitro test context.
 *
 * @example
 * import { setup } from 'nitro-test-utils'
 *
 * await setup({
 *  rootDir: fileURLToPath(new URL('fixture', import.meta.url)),
 * })
 */
export async function setup(options: Partial<TestOptions> = {}) {
  const vitest = await import('vitest')
  const server = vitest.inject('server')

  if (server) {
    throw new Error('Nitro server is already running in global setup.')
  }

  await createTestContext(options)

  vitest.beforeAll(async () => {
    await startServer()
  })

  vitest.afterAll(async () => {
    await stopServer()

    clearTestContext()
  })
}
