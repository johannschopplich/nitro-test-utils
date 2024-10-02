import type { FetchOptions, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'
import type { TestOptions } from './types'
import { ofetch } from 'ofetch'
import { inject } from 'vitest'
import { clearTestContext, createTestContext, injectTestContext } from './context'
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

/**
 * Creates a custom `ofetch` instance with the Nitro server URL as the base URL.
 *
 * @remarks
 * The following additional fetch options have been set as defaults:
 * - `ignoreResponseError: true` to prevent throwing errors on non-2xx responses.
 * - `redirect: 'manual'` to prevent automatic redirects.
 * - `headers: { accept: 'application/json' }` to force a JSON error response when Nitro returns an error.
 */
export function createFetch() {
  const serverUrl = injectServerUrl()

  return ofetch.create({
    baseURL: serverUrl,
    ignoreResponseError: true,
    redirect: 'manual',
    headers: {
      accept: 'application/json',
    },
  })
}

/**
 * Fetches the raw response from the Nitro server for the given path. `FetchOptions` can be passed to customize the request.
 *
 * @remarks
 * The following additional fetch options have been set as defaults:
 * - `ignoreResponseError: true` to prevent throwing errors on non-2xx responses.
 * - `redirect: 'manual'` to prevent automatic redirects.
 * - `headers: { accept: 'application/json' }` to force a JSON error response when Nitro returns an error.
 */
export async function $fetchRaw<T = any, R extends ResponseType = 'json'>(
  path: string,
  options?: FetchOptions<R>,
) {
  const serverUrl = injectServerUrl()
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

export function injectServerUrl() {
  const ctx = injectTestContext()
  let serverUrl = ctx?.server?.url

  if (!serverUrl) {
    serverUrl = inject('server')?.url
  }

  if (!serverUrl) {
    throw new Error('Nitro server is not running.')
  }

  return serverUrl
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
export async function setup(options: TestOptions = {}) {
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
