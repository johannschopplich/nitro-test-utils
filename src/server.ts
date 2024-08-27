import { resolve } from 'pathe'
import { getRandomPort } from 'get-port-please'
import { listen } from 'listhen'
import {
  build,
  createDevServer,
  prepare,
} from 'nitropack'
import { useTestContext } from './context'

/**
 * Start the server, both for dev and production.s
 */
export async function startServer() {
  await stopServer()

  const ctx = useTestContext()

  const host = '127.0.0.1'
  const port = 3000 || await getRandomPort(host)

  ctx.url = `http://${host}:${port}`

  if (ctx.options.isDev) {
    const server = createDevServer(ctx.nitro)
    ctx.server = await server.listen(port, { hostname: host })
    await prepare(ctx.nitro)
    const ready = new Promise<void>((resolve) => {
      ctx.nitro!.hooks.hook('dev:reload', () => resolve())
    })
    await build(ctx.nitro)
    await ready
  }
  else {
    const entryPath = resolve(ctx.nitro.options.output.dir, 'server', 'index.mjs')
    const { listener } = await import(entryPath)
    ctx.server = await listen(listener)
  }
}

/**
 * Stop the running server if any.
 */
export async function stopServer() {
  const ctx = useTestContext()

  if (ctx.server) {
    ctx.server.close()
  }
  if (ctx.nitro) {
    await ctx.nitro.close()
  }
}
