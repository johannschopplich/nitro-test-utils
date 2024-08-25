import { ofetch } from 'ofetch'
import type { FetchOptions, FetchResponse, MappedResponseType, ResponseType } from 'ofetch'
import { resolve } from 'pathe'
import { build, copyPublicAssets, createDevServer, prepare, prerender } from 'nitropack'
import { listen } from 'listhen'
import { createTestContext, useTestContext } from './context'
import type { SetupOptions } from './types'

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

/**
 * Setup options for the test context.
 *
 * @example
 * import { setup } from 'nitro-test-utils'
 *
 * await setup({
 *  rootDir: fileURLToPath(new URL('fixture', import.meta.url)),
 * })
 *
 */
export async function setup(options: SetupOptions) {
  const ctx = await createTestContext(options)

  const vitest = await import('vitest')

  vitest.beforeAll(async () => {
    // Setup development server
    if (ctx.isDev) {
      const devServer = createDevServer(ctx.nitro)
      ctx.server = await devServer.listen({})
      await prepare(ctx.nitro)
      const ready = new Promise<void>((resolve) => {
        ctx.nitro!.hooks.hook('dev:reload', () => resolve())
      })
      await build(ctx.nitro)
      await ready
    }
    // Build and serve production
    else {
      await prepare(ctx.nitro)
      await copyPublicAssets(ctx.nitro)
      await prerender(ctx.nitro)
      await build(ctx.nitro)

      const entryPath = resolve(ctx.nitro.options.output.dir, 'server/index.mjs')
      const { listener } = await import(entryPath)
      ctx.server = await listen(listener)
    }

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
