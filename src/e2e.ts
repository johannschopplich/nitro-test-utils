import type { $Fetch, ExtractedRouteMethod, Nitro, NitroEventHandler, NitroFetchOptions, NitroFetchRequest, TypedInternalResponse } from 'nitro/types'
import type { FetchHooks, FetchResponse } from 'ofetch'
import type { NitroTestOptions } from './types'
import { parseSetCookie } from 'cookie-es'
import { ofetch } from 'ofetch'
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

export interface NitroRouteInfo {
  /** HTTP pathname pattern (e.g. `/api/users`, `/api/users/:id`). */
  route: string
  /** HTTP method, or `undefined` when the handler matches any method. */
  method?: string
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
        const request = input instanceof Request ? input : new Request(input, init)
        return Promise.resolve(nitroFetch(request))
      },
    },
  ) as $Fetch
}

/**
 * Fetches the raw response from the Nitro server for the given path.
 *
 * Route-level typing is inherited automatically from Nitro's `InternalApi` augmentation
 * when your tsconfig extends `nitro/tsconfig`. See the README for setup instructions.
 *
 * @remarks
 * Applies the fetch defaults from {@link createNitroFetch}.
 */
export async function $fetchRaw<
  T = unknown,
  R extends NitroFetchRequest = NitroFetchRequest,
  O extends NitroFetchOptions<R> = NitroFetchOptions<R>,
>(
  request: R,
  options?: O,
): Promise<NitroFetchResponse<TypedInternalResponse<R, T, NitroFetchOptions<R> extends O ? 'get' : ExtractedRouteMethod<R, O>>>> {
  const localFetch = createNitroFetch()

  const response = await localFetch.raw<T, R, O>(request, options)

  Object.defineProperty(response, 'data', {
    enumerable: true,
    get() {
      return response._data
    },
  })

  return response as NitroFetchResponse<
    TypedInternalResponse<R, T, NitroFetchOptions<R> extends O ? 'get' : ExtractedRouteMethod<R, O>>
  >
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
        headers.set('cookie', existingCookie ? `${existingCookie}; ${cookieHeader}` : cookieHeader)
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

/**
 * Lists every route registered with the active Nitro test app,
 * excluding internal routes prefixed with `/_` or `/api/_`.
 *
 * @throws if called before `setup()` has started the app.
 */
export function listRoutes(): NitroRouteInfo[] {
  const ctx = injectTestContext()

  if (!ctx?.nitro) {
    throw new Error('Nitro test app is not running. Did you call `setup()`?')
  }

  return collectRoutes(ctx.nitro)
}

/**
 * @internal
 */
export function collectRoutes(nitro: Nitro): NitroRouteInfo[] {
  const sources: NitroEventHandler[] = [
    ...nitro.scannedHandlers,
    ...nitro.options.handlers,
  ]

  const seen = new Set<string>()
  const routes: NitroRouteInfo[] = []

  for (const { route, method } of sources) {
    if (!route)
      continue

    if (route.startsWith('/_') || route.startsWith('/api/_'))
      continue

    const key = `${method ?? '*'} ${route}`
    if (seen.has(key))
      continue

    seen.add(key)
    routes.push({ route, method: method || undefined })
  }

  return routes
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

  if (injectTestContext()?.isGlobal) {
    throw new Error('Nitro app is already running in global setup.')
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
