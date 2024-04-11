import { resolve } from 'pathe'
import { joinURL } from 'ufo'
import { listen } from 'listhen'
import { ofetch } from 'ofetch'
import {
  build,
  copyPublicAssets,
  createDevServer,
  createNitro,
  prepare,
  prerender,
} from 'nitropack'
import type { Listener } from 'listhen'
import type { FetchOptions, ResponseType } from 'ofetch'
import type { Nitro, NitroOptions } from 'nitropack'

export interface Context {
  preset: NitroOptions['preset']
  nitro?: Nitro
  rootDir: string
  outDir: string
  server?: Listener
  isDev: boolean
}

export async function setupContext({
  preset = 'node',
  // eslint-disable-next-line node/prefer-global/process
  rootDir = process.cwd(),
}: {
  preset?: NitroOptions['preset']
  rootDir?: string
} = {

}) {
  const ctx: Context = {
    preset,
    isDev: preset === 'nitro-dev',
    rootDir,
    outDir: resolve(rootDir, '.output'),
  }

  const nitro = (ctx.nitro = await createNitro({
    preset: ctx.preset,
    dev: ctx.isDev,
    rootDir: ctx.rootDir,
    buildDir: resolve(ctx.outDir, '.nitro'),
    serveStatic:
      !ctx.isDev,
    output: {
      dir: ctx.outDir,
    },
    timing: true,
  }))

  if (ctx.isDev) {
    // Setup development server
    const devServer = createDevServer(ctx.nitro)
    ctx.server = await devServer.listen({})
    await prepare(ctx.nitro)
    const ready = new Promise<void>((resolve) => {
      ctx.nitro!.hooks.hook('dev:reload', () => resolve())
    })
    await build(ctx.nitro)
    await ready
  }
  else {
    // Production build
    await prepare(nitro)
    await copyPublicAssets(nitro)
    await prerender(nitro)
    await build(nitro)
  }

  return ctx
}

export async function startServer(ctx: Context) {
  const entryPath = resolve(ctx.outDir, 'server/index.mjs')
  const { listener } = await import(entryPath)
  ctx.server = await listen(listener)
  // eslint-disable-next-line no-console
  console.log('>', ctx.server!.url)

  return async function () {
    if (ctx.server)
      await ctx.server.close()
    if (ctx.nitro)
      await ctx.nitro.close()
  }
}

export async function $fetch<T = any, R extends ResponseType = 'json'>(
  url: string,
  options?: FetchOptions<R>,
) {
  const { inject } = await import('vitest')
  const serverUrl = inject('nitroServerUrl')

  const response = await ofetch.raw<T, R>(joinURL(serverUrl, url), {
    ...options,
    ignoreResponseError: true,
    redirect: 'manual',
    headers: {
      // Enforce JSON response when routes fail
      accept: 'application/json',
      ...headersToObject(options?.headers),
    },
  })

  return {
    body: response._data as T,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  }
}

function headersToObject(headers?: HeadersInit) {
  return Object.fromEntries(new Headers(headers).entries())
}

declare module 'vitest' {
  export interface ProvidedContext {
    nitroServerUrl: string
  }
}
