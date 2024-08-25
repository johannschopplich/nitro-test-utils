import { ofetch } from 'ofetch'
import type { FetchOptions, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'
import { resolve } from 'pathe'
import { build, createDevServer, prepare } from 'nitropack'
import { createTestContext, useTestContext } from './context'

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
  const ctx = useTestContext()

  const localFetch = ofetch.create({
    baseURL: ctx.server!.url,
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

export interface SetupOptions {
  rootDir?: string
}

export async function setup(options: SetupOptions) {
  const ctx = await createTestContext(options)

  const vitest = await import('vitest')

  vitest.beforeAll(async () => {
    const devServer = createDevServer(ctx.nitro)
    ctx.server = await devServer.listen({})
    await prepare(ctx.nitro)
    const ready = new Promise<void>((resolve) => {
      ctx.nitro!.hooks.hook('dev:reload', () => resolve())
    })
    await build(ctx.nitro)
    await ready

    // eslint-disable-next-line no-console
    console.log('> Nitro server running at', ctx.server.url)
  })

  vitest.afterAll(async () => {
    if (ctx.server)
      await ctx.server.close()
    // End Nitro server after all tests
    if (ctx.nitro)
      await ctx.nitro.close()
  })
}
