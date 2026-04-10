import type { NitroTestContext } from './types'
import * as path from 'node:path'
import {
  build,
  copyPublicAssets,
  createDevServer,
  prepare,
  prerender,
} from 'nitro/builder'
import { injectTestContext } from './context'

declare global {
  // eslint-disable-next-line vars-on-top
  var __nitro__: Record<string, { fetch: (request: Request) => Response | Promise<Response> } | undefined> | undefined
}

/**
 * Starts the Nitro app in-process and exposes its request dispatcher on `ctx.fetch`.
 *
 * No HTTP listener is created. Tests invoke the app directly via its Web `Request` handler.
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
    // Side-effect: wires `ctx.nitro.fetch` + the worker runner. The instance is
    // closed automatically via the `nitro.close()` hook registered in its constructor.
    createDevServer(ctx.nitro)

    await prepare(ctx.nitro)
    const ready = new Promise<void>((resolve) => {
      ctx.nitro.hooks.hook('dev:reload', () => resolve())
    })
    await build(ctx.nitro)
    await ready

    ctx.fetch = ctx.nitro.fetch.bind(ctx.nitro)
  }
  else {
    await prepare(ctx.nitro)
    await copyPublicAssets(ctx.nitro)
    await prerender(ctx.nitro)
    await build(ctx.nitro)

    // Cache-bust the dynamic import so each `startServer()` call re-runs the entry's
    // top-level `useNitroApp()`. Without this, Node's ESM cache returns a stale module
    // and `globalThis.__nitro__.default` still points at the previously imported app.
    const entryPath = path.resolve(ctx.nitro.options.output.dir, 'server', 'index.mjs')
    await import(`${entryPath}?t=${Date.now()}`)

    const runtimeApp = globalThis.__nitro__?.default
    if (!runtimeApp?.fetch) {
      throw new Error(
        'Nitro app was not registered on `globalThis.__nitro__` after importing the build entry. '
        + 'Only presets that call `useNitroApp()` at module init are supported in production mode.',
      )
    }

    ctx.fetch = runtimeApp.fetch.bind(runtimeApp)
  }

  if (ctx.isGlobal) {
    // eslint-disable-next-line no-console
    console.log('[nitro] Test app ready (in-process dispatch)')
  }

  return ctx
}

/**
 * Releases the in-process Nitro app.
 *
 * @remarks
 * Dev mode cascades through `nitro.close()` to the worker manager and file watchers.
 * Production has no close path and leaks until the test process exits.
 */
export async function stopServer(): Promise<void> {
  const ctx = injectTestContext()

  if (ctx) {
    ctx.fetch = undefined
  }

  if (ctx?.nitro)
    await ctx.nitro.close()
}
