import { joinURL } from 'ufo'
import { ofetch } from 'ofetch'
import type { FetchOptions, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'

declare module 'vitest' {
  export interface ProvidedContext {
    nitroServerUrl: string
  }
}

export async function $fetch<T = any, R extends ResponseType = 'json'>(
  path: string,
  options?: FetchOptions<R>,
): Promise<FetchResponse<MappedResponseType<R, T>>> {
  const { inject } = await import('vitest')
  const serverUrl = inject('nitroServerUrl')

  return ofetch.raw<T, R>(
    joinURL(serverUrl, path),
    mergeFetchOptions<R>(options, {
      ignoreResponseError: true,
      redirect: 'manual',
      headers: {
        accept: 'application/json',
      },
    }),
  )
}

export function mergeFetchOptions<R extends ResponseType = 'json'>(
  input: FetchOptions<R> | undefined,
  defaults: FetchOptions<R> | undefined,
): FetchOptions<R> {
  const merged: FetchOptions<R> = {
    ...defaults,
    ...input,
  }

  // Merge params and query
  if (defaults?.params && input?.params) {
    merged.params = {
      ...defaults.params,
      ...input.params,
    }
  }
  if (defaults?.query && input?.query) {
    merged.query = {
      ...defaults.query,
      ...input.query,
    }
  }

  // Merge headers
  if (defaults?.headers && input?.headers) {
    merged.headers = new Headers(defaults.headers)
    for (const [key, value] of new Headers(input.headers))
      merged.headers.set(key, value)
  }

  return merged
}
