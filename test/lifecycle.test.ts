import type { FileMap } from './utils'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { serverFetch } from 'nitro'
import { getBuildInfo } from 'nitro/builder'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { $serverFetch } from '../src'
import { clearTestContext, createTestContext, injectTestContext } from '../src/context'
import { startServer, stopServer } from '../src/server'
import { createTempDir } from './utils'

const rootDir = path.resolve(import.meta.dirname, 'production-app')
const cloudflareRootDir = path.resolve(import.meta.dirname, 'cloudflare-app')
const testGlobal = globalThis as typeof globalThis & { __closedNitroApps__?: number }

afterEach(async () => {
  await stopServer()
  clearTestContext()
  vi.unstubAllEnvs()
})

describe('server lifecycle', () => {
  it('unregisters the serverFetch dispatcher on stop', async () => {
    await createTestContext({ rootDir, mode: 'production' })
    await startServer()

    const response = await serverFetch('/')
    expect(response.status).toBe(200)

    await stopServer()

    await expect(serverFetch('/')).rejects.toThrow('Nitro instance is not available.')
  })

  it('rejects when the dev build fails', async () => {
    const brokenRootDir = createTempApp({ 'routes/index.ts': 'export default (' })

    await createTestContext({ rootDir: brokenRootDir })

    await expect(startServer()).rejects.toThrow()
  })

  it('lets the shell environment override .env.test', async () => {
    const envRootDir = createTempApp({
      '.env.test': 'NITRO_TEST_UTILS_SOURCE=dotenv',
      'routes/index.ts': 'export default () => ({ source: process.env.NITRO_TEST_UTILS_SOURCE })',
    })
    vi.stubEnv('NITRO_TEST_UTILS_SOURCE', 'shell')

    await createTestContext({ rootDir: envRootDir, mode: 'production' })
    await startServer()

    const { data } = await $serverFetch('/')
    expect(data).toEqual({ source: 'shell' })
  })

  it('keeps .env.test over .env in a prerendered route', async () => {
    const envRootDir = createTempApp({
      'nitro.config.ts': 'export default { serverDir: \'.\', prerender: { routes: [\'/static\'] } }',
      '.env': 'NITRO_TEST_UTILS_FILE=.env',
      '.env.test': 'NITRO_TEST_UTILS_FILE=.env.test',
      'routes/static.ts': 'export default () => ({ file: process.env.NITRO_TEST_UTILS_FILE })',
    })
    // Unstubbing removes the value Nitro loads from the `.env` files.
    vi.stubEnv('NITRO_TEST_UTILS_FILE', undefined)

    await createTestContext({ rootDir: envRootDir, mode: 'production' })
    await startServer()

    const { data } = await $serverFetch('/static', { responseType: 'json' })
    expect(data).toEqual({ file: '.env.test' })
  })

  it('runs development mode with the preset option over the Nitro config\'s', async () => {
    await createTestContext({ rootDir: cloudflareRootDir, preset: 'nitro-dev' })
    await startServer()

    const { data } = await $serverFetch('/api/preset')
    expect(data).toEqual({ preset: 'nitro-dev' })
  })

  it('leaves the dev bundle of a running nitro dev untouched', async () => {
    const appRootDir = createTempApp({ 'routes/index.ts': 'export default () => \'ok\'' })
    const nitroDevEntry = path.join(appRootDir, 'node_modules/.nitro/dev/index.mjs')
    fs.mkdirSync(path.dirname(nitroDevEntry), { recursive: true })
    fs.writeFileSync(nitroDevEntry, '// nitro dev')

    await createTestContext({ rootDir: appRootDir })
    await startServer()

    expect(fs.readFileSync(nitroDevEntry, 'utf8')).toBe('// nitro dev')
  })

  it('runs the app\'s close hooks when an in-process production build stops', async () => {
    await createTestContext({ rootDir, mode: 'production' })
    await startServer()
    const closedAppCount = testGlobal.__closedNitroApps__ ?? 0

    await stopServer()

    expect(testGlobal.__closedNitroApps__).toBe(closedAppCount + 1)
  })

  it('stops an in-process production build whose close hook throws', async () => {
    await createTestContext({ rootDir, mode: 'production' })
    await startServer()
    vi.stubEnv('NITRO_TEST_UTILS_FAIL_CLOSE', 'true')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())

    await expect(stopServer()).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith('[nitro] Error while calling `close` hooks:', expect.any(Error))
  })

  it('serves node-server again on a second start in the same worker', async () => {
    for (let index = 0; index < 2; index++) {
      await createTestContext({ rootDir, mode: 'production', preset: 'node-server' })
      await startServer()

      const { data } = await $serverFetch('/preset')
      expect(data).toEqual({ preset: 'node-server' })

      await stopServer()
    }
  })

  it('keeps .env.production out of the app', async () => {
    await createTestContext({ rootDir, mode: 'production' })
    await startServer()

    const { data } = await $serverFetch('/dotenv')
    expect(data).toEqual({ productionOnly: null })
  })

  it('restores the last-build pointer after a production build', async () => {
    const lastBuildPath = path.join(rootDir, 'node_modules/.nitro/last-build.json')
    const content = '{"outputDir":"../../.output"}'
    onTestFinished(() => fs.rmSync(lastBuildPath, { force: true }))
    fs.mkdirSync(path.dirname(lastBuildPath), { recursive: true })
    fs.writeFileSync(lastBuildPath, content)

    await createTestContext({ rootDir, mode: 'production' })
    await startServer()

    expect(fs.readFileSync(lastBuildPath, 'utf8')).toBe(content)
  })

  it('keeps nitro preview off the test build', async () => {
    fs.rmSync(path.join(rootDir, 'node_modules/.nitro/last-build.json'), { force: true })

    await createTestContext({ rootDir, mode: 'production' })
    await startServer()

    const { outputDir } = await getBuildInfo({ rootDir })
    expect(outputDir).not.toBe(path.resolve(injectTestContext()!.nitro.options.output.dir))
  })

  it('stops wrangler before stopServer resolves', async () => {
    await createTestContext({ rootDir: cloudflareRootDir, mode: 'production', preset: 'cloudflare-module' })
    await startServer()
    const previewFetch = injectTestContext()!.preview!.fetch

    const response = await previewFetch(new Request('http://nitro.test/api/bindings'))
    expect(response.status).toBe(200)

    await stopServer()

    await expect(previewFetch(new Request('http://nitro.test/api/bindings'))).rejects.toThrow('ECONNREFUSED')
  })

  it('restores the wrangler deploy redirect before serving the test build', async () => {
    const redirectPath = path.join(cloudflareRootDir, '.wrangler/deploy/config.json')
    onTestFinished(() => fs.rmSync(redirectPath, { force: true }))

    fs.mkdirSync(path.dirname(redirectPath), { recursive: true })
    fs.writeFileSync(redirectPath, '{"configPath":"../../dist/server/wrangler.json"}')

    await createTestContext({ rootDir: cloudflareRootDir, mode: 'production', preset: 'cloudflare-module' })
    await startServer()

    expect(fs.readFileSync(redirectPath, 'utf8')).toBe('{"configPath":"../../dist/server/wrangler.json"}')
    const { status } = await $serverFetch('/api/bindings')
    expect(status).toBe(200)
  })
})

describe('createTestContext', () => {
  it.each([
    'node-middleware',
    'nodeMiddleware',
    'aws-lambda',
    'cloudflare-pages',
    'cloudflare-durable',
  ])('rejects the %s preset in production mode', async (preset) => {
    await expect(createTestContext({ rootDir, mode: 'production', preset }))
      .rejects
      .toThrow('Production mode supports the "standard", "node-server", and "cloudflare-module" presets')
  })

  it('rejects a Cloudflare production build without wrangler installed', async () => {
    await expect(createTestContext({ rootDir, mode: 'production', preset: 'cloudflare-module' }))
      .rejects
      .toThrow('Couldn\'t resolve `wrangler` from')
  })

  it('rejects Cloudflare presets in global production mode', async () => {
    await expect(createTestContext({
      rootDir: cloudflareRootDir,
      mode: 'production',
      preset: 'cloudflare-module',
      isGlobal: true,
    }))
      .rejects
      .toThrow('Global production mode does not support Cloudflare presets')
  })
})

function createTempApp(files: FileMap): string {
  return createTempDir({ 'nitro.config.ts': 'export default { serverDir: \'.\' }', ...files })
}
