import type { SetCookie } from 'cookie-es'
import type { $Fetch, FetchHooks, FetchOptions, FetchRequest, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'
import { parseSetCookie } from 'cookie-es'
import { serverFetch } from 'nitro'
import { ofetch } from 'ofetch'

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
 * Fetches the raw response from the Nitro app for the given path, with the body parsed.
 *
 * @remarks
 * Dispatches through `serverFetch` from `nitro`. The following fetch defaults differ from `ofetch`:
 * - `ignoreResponseError: true` to prevent throwing on non-2xx responses.
 * - `retry: 0` to disable retries, preventing masked failures and slow test suites.
 * - `headers: { accept: 'application/json' }` to force a JSON error body when Nitro errors.
 */
export async function $serverFetch<T = any, R extends ResponseType = 'json'>(
  request: FetchRequest,
  options?: FetchOptions<R>,
): Promise<NitroFetchResponse<MappedResponseType<R, T>>> {
  const response = await createServerFetch().raw<T, R>(request, options)

  Object.defineProperty(response, 'data', {
    enumerable: true,
    get() {
      return response._data
    },
  })

  return response as NitroFetchResponse<MappedResponseType<R, T>>
}

/**
 * Creates a session-aware `ofetch` instance that persists cookies across requests.
 *
 * @remarks
 * Applies the fetch defaults from {@link $serverFetch}.
 */
export function createNitroSession(): NitroSession {
  const cookies = new Map<string, string>()

  const $fetch = createServerFetch({
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
        const cookie = parseSetCookie(header)
        if (!cookie?.name)
          continue

        if (isExpired(cookie))
          cookies.delete(cookie.name)
        else
          cookies.set(cookie.name, cookie.value)
      }
    },
  })

  return {
    $fetch,
    cookies,
    clearCookies: () => cookies.clear(),
  }
}

function createServerFetch(hooks?: FetchHooks): $Fetch {
  return ofetch.create(
    {
      baseURL: SYNTHETIC_BASE_URL,
      ignoreResponseError: true,
      retry: 0,
      headers: {
        accept: 'application/json',
      },
      ...hooks,
    },
    {
      fetch: (input, init) => serverFetch(input, init),
    },
  )
}

// `Max-Age` takes precedence over `Expires`, per RFC 6265.
function isExpired(cookie: SetCookie): boolean {
  if (cookie.maxAge !== undefined)
    return cookie.maxAge <= 0

  return cookie.expires !== undefined && cookie.expires.getTime() <= Date.now()
}
