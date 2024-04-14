import { ofetch } from 'ofetch'
import type { FetchOptions, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'

declare module 'vitest' {
  export interface ProvidedContext {
    nitroServerUrl: string
  }
}

export interface TestFetchResponse<T> extends FetchResponse<T> {
  /** Alias for `response._data` */
  data?: T
}

export async function $fetch<T = any, R extends ResponseType = 'json'>(
  path: string,
  options?: FetchOptions<R>,
) {
  const { inject } = await import('vitest')
  const localFetch = ofetch.create({
    baseURL: inject('nitroServerUrl'),
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
