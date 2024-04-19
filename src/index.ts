import process from 'node:process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'pathe'
import { listen } from 'listhen'
import * as dotenv from 'dotenv'
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
import { NITRO_OUTPUT_DIR } from './constants'

export interface NitroTestContext {
  preset: NitroOptions['preset']
  nitro: Nitro
  server?: Listener
  isDev: boolean
}

export { $fetch } from './e2e'

export async function setupContext({
  preset = 'nitro-dev',
  rootDir = process.cwd(),
}: {
  preset?: NitroOptions['preset']
  rootDir?: string
} = {

}) {
  await setupDotenv({ rootDir })

  const isDev = preset === 'nitro-dev'
  const outDir = resolve(rootDir, NITRO_OUTPUT_DIR)
  const ctx: NitroTestContext = {
    preset,
    isDev,
    nitro: await createNitro({
      preset,
      dev: isDev,
      rootDir,
      buildDir: resolve(outDir, '.nitro'),
      serveStatic: !isDev,
      output: {
        dir: outDir,
      },
      timing: true,
    }),
  }

  // Setup development server
  if (ctx.isDev) {
    const devServer = createDevServer(ctx.nitro)
    ctx.server = await devServer.listen({})
    await prepare(ctx.nitro)
    const ready = new Promise<void>((resolve) => {
      ctx.nitro!.hooks.hook('dev:reload', () => resolve())
    })
    await build(ctx.nitro)
    await ready
  }
  // Build and serve production
  else {
    await prepare(ctx.nitro)
    await copyPublicAssets(ctx.nitro)
    await prerender(ctx.nitro)
    await build(ctx.nitro)

    const entryPath = resolve(outDir, 'server/index.mjs')
    const { listener } = await import(entryPath)
    ctx.server = await listen(listener)
  }

  // eslint-disable-next-line no-console
  console.log('> Nitro server running at', ctx.server.url)

  return ctx
}

export async function setupDotenv({
  rootDir = process.cwd(),
  fileName = '.env.test',
  override = true,
}: {
  rootDir?: string
  fileName?: string
  override?: boolean
} = {}) {
  const environment = Object.create(null) as Record<string, string>
  const dotenvFile = resolve(rootDir, fileName)

  if (existsSync(dotenvFile)) {
    const parsed = dotenv.parse(await readFile(dotenvFile, 'utf8'))
    Object.assign(environment, parsed)
  }

  // Fill environment variables
  for (const key in environment) {
    if (override || process.env[key] === undefined)
      process.env[key] = environment[key]
  }

  return environment
}
