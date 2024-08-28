import { resolve } from 'pathe'
import { listen } from 'listhen'
import {
  build,
  createDevServer,
  prepare,
} from 'nitropack'
import { injectTestContext } from './context'

/**
 * Start the server, either in development mode or production mode.
 */
export async function startServer() {
  await stopServer()

  const ctx = injectTestContext()

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
    const entryPath = resolve(ctx.nitro.options.output.dir, 'server', 'index.mjs')
    const { listener } = await import(entryPath)
    ctx.server = await listen(listener)
  }

  // eslint-disable-next-line no-console
  console.log('> Nitro server running at', ctx.server.url)
}

/**
 * Stop the running server if any.
 */
export async function stopServer() {
  const ctx = injectTestContext()

  if (ctx.server)
    await ctx.server.close()
  if (ctx.nitro)
    await ctx.nitro.close()
}
