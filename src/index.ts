import process from 'node:process'
import { resolve } from 'pathe'
import { listen } from 'listhen'
import {
  build,
  copyPublicAssets,
  createDevServer,
  prepare,
  prerender,
} from 'nitropack'
import type { NitroOptions } from 'nitropack'
import { createTestContext } from './context'

export * from './types'

export { $fetch } from './e2e'

export async function setupContext({
  preset = 'nitro-dev',
  rootDir = process.cwd(),
}: {
  preset?: NitroOptions['preset']
  rootDir?: string
} = {

}) {
  const ctx = await createTestContext({ preset, rootDir })

  // Setup development server
  if (ctx.isDev) {
    // const devServer = createDevServer(ctx.nitro)
    // ctx.server = await devServer.listen({})
    // await prepare(ctx.nitro)
    // const ready = new Promise<void>((resolve) => {
    //   ctx.nitro!.hooks.hook('dev:reload', () => resolve())
    // })
    // await build(ctx.nitro)
    // await ready
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

  // console.log('> Nitro server running at', ctx.server.url)

  return ctx
}
