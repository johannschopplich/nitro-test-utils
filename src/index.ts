import { resolve } from 'pathe'
import { listen } from 'listhen'
import {
  build,
  copyPublicAssets,
  createDevServer,
  createNitro,
  prepare,
  prerender,
} from 'nitropack'
import type { Listener } from 'listhen'
import type { Nitro, NitroOptions } from 'nitropack'

declare module 'vitest' {
  export interface ProvidedContext {
    nitroServerUrl: string
  }
}

export interface Context {
  preset: NitroOptions['preset']
  nitro?: Nitro
  rootDir: string
  outDir: string
  server?: Listener
  isDev: boolean
}

export { $fetch } from './e2e'

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
    serveStatic: !ctx.isDev,
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
