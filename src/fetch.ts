import type { $Fetch, FetchHooks, FetchOptions, FetchRequest, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'
import { parseSetCookie } from 'cookie-es'
import { ofetch } from 'ofetch'
import { injectTestContext } from './context'

export interface NitroSession {
  $fetch: $Fetch
  cookies: Map<string, string>
  clearCookies: () => void
}

export interface NitroFetchResponse<T> extends FetchResponse<T> {
  /** Alias for `response._data`. */
  data?: T
}

const SYNTHETIC_BASE_URL = 'http://nitro.test'

/**
 * Creates a custom `ofetch` instance that dispatches requests in-process against the
 * active Nitro test app. Each call builds a Web `Request` and hands it to
 * `injectNitroFetch()`, so no HTTP listener is involved.
 *
 * @remarks
 * The following fetch defaults differ from `ofetch`:
 * - `ignoreResponseError: true` to prevent throwing on non-2xx responses.
 * - `redirect: 'manual'` to prevent automatic redirects.
 * - `retry: 0` to disable retries, preventing masked failures and slow test suites.
 * - `headers: { accept: 'application/json' }` to force a JSON error body when Nitro errors.
 */
export function createNitroFetch(options?: FetchHooks): $Fetch {
  const nitroFetch = injectNitroFetch()

  return ofetch.create(
    {
      baseURL: SYNTHETIC_BASE_URL,
      ignoreResponseError: true,
      redirect: 'manual',
      retry: 0,
      headers: {
        accept: 'application/json',
      },
      ...options,
    },
    {
      fetch: (input, init) => {
        const request = input instanceof Request
          ? input
          : new Request(input, init)
        return Promise.resolve(nitroFetch(request))
      },
    },
  )
}

/**
 * Fetches the raw response from the Nitro server for the given path.
 *
 * @remarks
 * Applies the fetch defaults from {@link createNitroFetch}.
 */
export async function $fetchRaw<T = any, R extends ResponseType = 'json'>(
  request: FetchRequest,
  options?: FetchOptions<R>,
): Promise<NitroFetchResponse<MappedResponseType<R, T>>> {
  const localFetch = createNitroFetch()

  const response = await localFetch.raw<T, R>(request, options)

  Object.defineProperty(response, 'data', {
    enumerable: true,
    get() {
      return response._data
    },
  })

  return response as NitroFetchResponse<MappedResponseType<R, T>>
}

/**
 * Returns the raw in-process request dispatcher for the active Nitro test app.
 *
 * This is the low-level primitive that `createNitroFetch` builds on. Reach for it when
 * you want to construct a `Request` yourself, or when you need to hand the dispatcher to
 * a different layer (for example `srvx.serve({ fetch: injectNitroFetch() })` to stand up
 * a real HTTP listener on top of the test app).
 *
 * @throws if called before `setup()` has started the app.
 */
export function injectNitroFetch(): (request: Request) => Response | Promise<Response> {
  const ctx = injectTestContext()
  const fetch = ctx?.fetch

  if (!fetch) {
    throw new Error('Nitro test app is not running. Did you call `setup()`?')
  }

  return fetch
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
        headers.set('cookie', existingCookie
          ? `${existingCookie}; ${cookieHeader}`
          : cookieHeader)
        options.headers = headers
      }
    },
    onResponse({ response }) {
      for (const header of response.headers.getSetCookie()) {
        const { name, value } = parseSetCookie(header)!
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
