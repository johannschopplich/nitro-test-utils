import type { AddressInfo } from 'node:net'
import type { NitroTestContext } from './types'
import { createServer } from 'node:http'
import {
  build,
  copyPublicAssets,
  createDevServer,
  prepare,
  prerender,
} from 'nitro/builder'
import { resolve } from 'pathe'
import { injectTestContext } from './context'

/**
 * Start the server, either in development mode or production mode.
 */
export async function startServer(): Promise<NitroTestContext> {
  const ctx = injectTestContext()

  if (!ctx) {
    throw new Error('Nitro test context is not initialized.')
  }

  if (!ctx.isGlobal) {
    await stopServer()
  }

  if (ctx.isDev) {
    const devServer = createDevServer(ctx.nitro)
    const server = devServer.listen()

    ctx.server = {
      url: server.url!,
      close: () => server.close(),
    }

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
    const { middleware } = await import(entryPath)
    const httpServer = createServer(middleware)

    // Listen on a random available port
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(0, () => resolve())
        .on('error', error => reject(error))
    })

    const { port } = httpServer.address() as AddressInfo
    ctx.server = {
      url: `http://localhost:${port}`,
      close: async () => {
        httpServer.closeAllConnections()
        await new Promise<void>((resolve, reject) => {
          httpServer.close(error => error ? reject(error) : resolve())
        })
      },
    }
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
export async function stopServer(): Promise<void> {
  const ctx = injectTestContext()

  if (ctx?.server) {
    await ctx.server.close()
    ctx.server = undefined
  }

  if (ctx?.nitro)
    await ctx.nitro.close()
}
