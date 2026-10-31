import type { NitroTestContext } from './context'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import {
  build,
  copyPublicAssets,
  createDevServer,
  prepare,
  prerender,
  startPreview,
} from 'nitro/builder'
import { injectTestContext, NITRO_BUILD_DIR } from './context'

type NitroFetch = (request: Request) => Response | Promise<Response>

const nitroGlobal = globalThis as typeof globalThis & {
  __nitro__?: Record<string, { fetch: NitroFetch } | undefined>
}

/**
 * Starts the Nitro app and registers its request dispatcher for `serverFetch` from `nitro`.
 *
 * @remarks
 * Development mode dispatches through the preset's dev runner. Production mode builds the app,
 * then loads `standard` and `node-server` builds in-process and runs Cloudflare builds in `wrangler dev`.
 */
export async function startServer(): Promise<NitroTestContext> {
  const ctx = injectTestContext()

  if (!ctx) {
    throw new Error('Nitro test context is not initialized.')
  }

  if (!ctx.isGlobal) {
    await stopServer()
  }

  let fetch: NitroFetch

  if (ctx.isDev) {
    // Side-effect: wires `ctx.nitro.fetch` + the worker runner. The instance is
    // closed automatically via the `nitro.close()` hook registered in its constructor.
    createDevServer(ctx.nitro)

    await prepare(ctx.nitro)
    // A failed build fires `dev:error` instead of `dev:reload`.
    const ready = new Promise<void>((resolve, reject) => {
      ctx.nitro.hooks.hookOnce('dev:reload', () => resolve())
      ctx.nitro.hooks.hookOnce('dev:error', error => reject(error))
    })
    await build(ctx.nitro)
    await ready

    fetch = ctx.nitro.fetch.bind(ctx.nitro)
  }
  else {
    const { rootDir } = ctx.options
    const { wranglerBin } = ctx
    const outputDir = ctx.nitro.options.output.dir

    // A production build repoints Nitro's last-build pointer and, for Cloudflare, Wrangler's
    // deploy redirect at the test build; `nitro preview` or `wrangler deploy` would pick it up.
    const restoreLastBuild = snapshotFile(path.join(rootDir, NITRO_BUILD_DIR, 'last-build.json'))
    const restoreWranglerRedirect = wranglerBin
      ? snapshotFile(path.join(rootDir, '.wrangler/deploy/config.json'))
      : undefined

    try {
      await prepare(ctx.nitro)
      await copyPublicAssets(ctx.nitro)
      // Nitro's prerenderer loads `.env` and `.env.local` again, over the values from `.env.test`.
      // Restored before it renders, and again in case it never initializes.
      const restoreEnv = snapshotEnv()
      ctx.nitro.hooks.hookOnce('prerender:init', restoreEnv)
      await prerender(ctx.nitro).finally(restoreEnv)
      await build(ctx.nitro)
    }
    finally {
      restoreLastBuild()
      restoreWranglerRedirect?.()
    }

    if (wranglerBin) {
      // TODO: Switch back to `startPreview` once its `close()` stops `wrangler` where `/bin/sh` is
      // `dash` and its `fetch` forwards the request's abort signal.
      // Imported on demand, so in-process presets never load `httpxy` and `get-port-please`.
      const { startWrangler } = await import('./wrangler')
      ctx.preview = await startWrangler(rootDir, wranglerBin, path.join(ctx.nitro.options.output.serverDir, 'wrangler.json'))
    }
    else {
      // `startPreview` loads `.env.preview`, `.env.production`, and `.env` from `rootDir`;
      // the output directory has none of them.
      ctx.preview = await startPreview({ rootDir: outputDir, outputDir })
    }
    fetch = ctx.preview.fetch
  }

  nitroGlobal.__nitro__ = {
    ...nitroGlobal.__nitro__,
    default: { fetch },
  }

  if (ctx.isGlobal) {
    // eslint-disable-next-line no-console
    console.log('[nitro] Test app ready')
  }

  return ctx
}

/**
 * Releases the Nitro app and unregisters its `serverFetch` dispatcher.
 *
 * @remarks
 * Development mode cascades through `nitro.close()` to the worker runner and file watchers.
 * Production mode stops a Cloudflare build's `wrangler` and waits for it to exit; an in-process
 * entry stays loaded until the test process exits.
 */
export async function stopServer(): Promise<void> {
  const ctx = injectTestContext()

  if (nitroGlobal.__nitro__)
    delete nitroGlobal.__nitro__.default

  if (!ctx)
    return

  await ctx.preview?.close()
  ctx.preview = undefined
  await ctx.nitro.close()
}

/**
 * Captures a file's current content and returns a function that writes it back,
 * or removes the file when it didn't exist.
 */
function snapshotFile(filePath: string): () => void {
  const content = fs.existsSync(filePath)
    ? fs.readFileSync(filePath)
    : undefined

  return () => {
    if (content === undefined)
      fs.rmSync(filePath, { force: true })
    else
      fs.writeFileSync(filePath, content)
  }
}

function snapshotEnv(): () => void {
  const env = { ...process.env }

  return () => {
    for (const key of Object.keys(process.env)) {
      if (!(key in env))
        delete process.env[key]
    }
    Object.assign(process.env, env)
  }
}
