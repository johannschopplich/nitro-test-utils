import type { NitroTestContext } from './context'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  build,
  copyPublicAssets,
  createDevServer,
  prepare,
  prerender,
  startPreview,
} from 'nitro/builder'
import { injectTestContext, isCloudflarePreset, NITRO_BUILD_DIR } from './context'

type NitroFetch = (request: Request) => Response | Promise<Response>

const nitroGlobal = globalThis as typeof globalThis & {
  __nitro__?: Record<string, { fetch: NitroFetch } | undefined>
}

/**
 * Starts the Nitro app and registers its request dispatcher for `serverFetch` from `nitro`.
 *
 * @remarks
 * Development mode dispatches through the preset's dev runner. Production mode builds the app
 * and serves the output through Nitro's `startPreview`: `standard` and `node-server` load the
 * server entry in-process, Cloudflare presets spawn `wrangler` and proxy to it.
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
    const ready = new Promise<void>((resolve) => {
      ctx.nitro.hooks.hook('dev:reload', () => resolve())
    })
    await build(ctx.nitro)
    await ready

    fetch = ctx.nitro.fetch.bind(ctx.nitro)
  }
  else {
    const { rootDir } = ctx.options
    const outputDir = ctx.nitro.options.output.dir
    const isCloudflare = isCloudflarePreset(ctx.nitro.options.preset)

    // A production build repoints Nitro's last-build pointer and, for Cloudflare, Wrangler's
    // deploy redirect at the test build; `nitro preview` or `wrangler deploy` would pick it up.
    // `wrangler` reads the redirect while it runs, so it's restored on stop.
    const restoreLastBuild = snapshotFile(path.join(rootDir, NITRO_BUILD_DIR, 'last-build.json'))
    if (isCloudflare)
      ctx.restoreWranglerRedirect = snapshotFile(path.join(rootDir, '.wrangler/deploy/config.json'))

    try {
      await prepare(ctx.nitro)
      await copyPublicAssets(ctx.nitro)
      await prerender(ctx.nitro)
      await build(ctx.nitro)
    }
    finally {
      restoreLastBuild()
    }

    ctx.preview = await startPreview({
      // The preview loads `.env.preview`, `.env.production`, and `.env` from this directory.
      // In-process presets get the output directory, which has none of them; `wrangler` needs the root.
      rootDir: isCloudflare ? rootDir : outputDir,
      outputDir,
    })
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
 * Production mode stops a spawned preview process; an in-process entry stays loaded
 * until the test process exits.
 */
export async function stopServer(): Promise<void> {
  const ctx = injectTestContext()

  if (nitroGlobal.__nitro__)
    delete nitroGlobal.__nitro__.default

  if (!ctx)
    return

  await ctx.preview?.close()
  ctx.preview = undefined
  ctx.restoreWranglerRedirect?.()
  ctx.restoreWranglerRedirect = undefined
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
