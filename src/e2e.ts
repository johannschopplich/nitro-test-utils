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
  const fetcher = ofetch.create({
    baseURL: inject('nitroServerUrl'),
    ignoreResponseError: true,
    redirect: 'manual',
    headers: {
      accept: 'application/json',
    },
  })

  return fetcher.raw<T, R>(
    path,
    options,
  )
}
