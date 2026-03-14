import type { $Fetch, FetchHooks, FetchOptions, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'
import type { NitroTestOptions } from './types'
import { parseSetCookie } from 'cookie-es'
import { ofetch } from 'ofetch'
import { inject } from 'vitest'
import { clearTestContext, createTestContext, injectTestContext } from './context'
import { startServer, stopServer } from './server'

export interface NitroSession {
  $fetch: $Fetch
  cookies: Map<string, string>
  clearCookies: () => void
}

export interface NitroFetchResponse<T> extends FetchResponse<T> {
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
 * - `retry: 0` to disable retries, preventing masked failures and slow test suites.
 * - `headers: { accept: 'application/json' }` to force a JSON error response when Nitro returns an error.
 */
export function createNitroFetch(options?: FetchHooks): $Fetch {
  const serverUrl = injectServerUrl()

  return ofetch.create({
    baseURL: serverUrl,
    ignoreResponseError: true,
    redirect: 'manual',
    retry: 0,
    headers: {
      accept: 'application/json',
    },
    ...options,
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
): Promise<NitroFetchResponse<MappedResponseType<R, T>>> {
  const localFetch = createNitroFetch()

  const response = await localFetch.raw<T, R>(
    path,
    options,
  )

  Object.defineProperty(response, 'data', {
    enumerable: true,
    get() {
      return response._data
    },
  })

  return response as NitroFetchResponse<MappedResponseType<R, T>>
}

export function injectServerUrl(): string {
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
 * Creates a session-aware `ofetch` instance that persists cookies across requests.
 */
export function createNitroSession(): NitroSession {
  const cookies = new Map<string, string>()

  const $fetch = createNitroFetch({
    onRequest({ options }) {
      if (cookies.size > 0) {
        const cookieHeader = Array.from(
          cookies.entries(),
          ([name, value]) => `${name}=${value}`,
        ).join('; ')

        const headers = new Headers(options.headers)
        const existingCookie = headers.get('cookie')
        headers.set('cookie', existingCookie ? `${existingCookie}; ${cookieHeader}` : cookieHeader)
        options.headers = headers
      }
    },
    onResponse({ response }) {
      for (const header of response.headers.getSetCookie()) {
        const { name, value } = parseSetCookie(header)
        if (name) {
          cookies.set(name, value)
        }
      }
    },
  })

  return {
    $fetch,
    cookies,
    clearCookies: () => cookies.clear(),
  }
}

/**
 * Setup options for the Nitro test context.
 *
 * @example
 * import { resolve } from 'node:path'
 * import { setup } from 'nitro-test-utils'
 *
 * await setup({
 *  rootDir: resolve(import.meta.dirname, 'fixture'),
 * })
 */
export async function setup(options: NitroTestOptions = {}): Promise<void> {
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
