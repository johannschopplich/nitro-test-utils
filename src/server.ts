import { resolve } from 'pathe'
import { listen } from 'listhen'
import {
  build,
  copyPublicAssets,
  createDevServer,
  prepare,
  prerender,
} from 'nitropack'
import { injectTestContext } from './context'

/**
 * Start the server, either in development mode or production mode.
 */
export async function startServer() {
  const ctx = injectTestContext()

  if (!ctx) {
    throw new Error('Nitro test context is not initialized.')
  }

  if (!ctx.isGlobal) {
    await stopServer()
  }

  if (ctx.isDev) {
    const server = createDevServer(ctx.nitro)
    ctx.server = await server.listen({})
    await prepare(ctx.nitro)
    const ready = new Promise<void>((resolve) => {
      ctx.nitro.hooks.hook('dev:reload', () => resolve())
    })
    await build(ctx.nitro)
    await ready
  }
  else {
    await prepare(ctx.nitro)
    await copyPublicAssets(ctx.nitro)
    await prerender(ctx.nitro)
    await build(ctx.nitro)

    const entryPath = resolve(ctx.nitro.options.output.dir, 'server', 'index.mjs')
    const { listener } = await import(entryPath)
    ctx.server = await listen(listener)
  }

  if (ctx.isGlobal) {
    // eslint-disable-next-line no-console
    console.log('> Nitro server running at', ctx.server.url)
  }

  return ctx
}

/**
 * Stop the running server if any.
 */
export async function stopServer() {
  const ctx = injectTestContext()

  if (ctx?.server)
    await ctx.server.close()
  if (ctx?.nitro)
    await ctx.nitro.close()
}
