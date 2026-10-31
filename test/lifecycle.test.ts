import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { serverFetch } from 'nitro'
import { afterEach, describe, expect, it, onTestFinished } from 'vitest'
import { $serverFetch } from '../src'
import { clearTestContext, createTestContext, injectTestContext } from '../src/context'
import { startServer, stopServer } from '../src/server'

const rootDir = path.resolve(import.meta.dirname, 'production-app')
const cloudflareRootDir = path.resolve(import.meta.dirname, 'cloudflare-app')

afterEach(async () => {
  await stopServer()
  clearTestContext()
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
    const brokenRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nitro-test-utils-'))
    onTestFinished(() => fs.rmSync(brokenRootDir, { recursive: true, force: true }))
    fs.writeFileSync(path.join(brokenRootDir, 'nitro.config.ts'), 'export default { serverDir: \'.\' }')
    fs.mkdirSync(path.join(brokenRootDir, 'routes'))
    fs.writeFileSync(path.join(brokenRootDir, 'routes/index.ts'), 'export default (')

    await createTestContext({ rootDir: brokenRootDir })

    await expect(startServer()).rejects.toThrow()
  })

  it('lets the shell environment override .env.test', async () => {
    // Inside the repository, so the build resolves `nitro` from its `node_modules`.
    const envRootDir = fs.mkdtempSync(path.join(import.meta.dirname, '.tmp-'))
    onTestFinished(() => fs.rmSync(envRootDir, { recursive: true, force: true }))
    fs.writeFileSync(path.join(envRootDir, 'nitro.config.ts'), 'export default { serverDir: \'.\' }')
    fs.writeFileSync(path.join(envRootDir, '.env.test'), 'NITRO_TEST_UTILS_SOURCE=dotenv')
    fs.mkdirSync(path.join(envRootDir, 'routes'))
    fs.writeFileSync(path.join(envRootDir, 'routes/index.ts'), 'export default () => ({ source: process.env.NITRO_TEST_UTILS_SOURCE })')
    process.env.NITRO_TEST_UTILS_SOURCE = 'shell'
    onTestFinished(() => {
      delete process.env.NITRO_TEST_UTILS_SOURCE
    })

    await createTestContext({ rootDir: envRootDir, mode: 'production' })
    await startServer()

    const { data } = await $serverFetch('/')
    expect(data).toEqual({ source: 'shell' })
  })

  it('leaves the dev build of a running nitro dev untouched', async () => {
    // Inside the repository, so the build resolves `nitro` from its `node_modules`.
    const appRootDir = fs.mkdtempSync(path.join(import.meta.dirname, '.tmp-'))
    onTestFinished(() => fs.rmSync(appRootDir, { recursive: true, force: true }))
    fs.writeFileSync(path.join(appRootDir, 'nitro.config.ts'), 'export default { serverDir: \'.\' }')
    fs.mkdirSync(path.join(appRootDir, 'routes'))
    fs.writeFileSync(path.join(appRootDir, 'routes/index.ts'), 'export default () => \'ok\'')
    const nitroDevEntry = path.join(appRootDir, 'node_modules/.nitro/dev/index.mjs')
    fs.mkdirSync(path.dirname(nitroDevEntry), { recursive: true })
    fs.writeFileSync(nitroDevEntry, '// nitro dev')

    await createTestContext({ rootDir: appRootDir })
    await startServer()

    expect(fs.readFileSync(nitroDevEntry, 'utf8')).toBe('// nitro dev')
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

  it.each([
    { label: 'content', content: '{"outputDir":"../../.output"}' },
    { label: 'absence', content: undefined },
  ])('restores the last-build pointer\'s $label after a production build', async ({ content }) => {
    const lastBuildPath = path.join(rootDir, 'node_modules/.nitro/last-build.json')
    onTestFinished(() => fs.rmSync(lastBuildPath, { force: true }))

    fs.rmSync(lastBuildPath, { force: true })
    if (content !== undefined) {
      fs.mkdirSync(path.dirname(lastBuildPath), { recursive: true })
      fs.writeFileSync(lastBuildPath, content)
    }

    await createTestContext({ rootDir, mode: 'production' })
    await startServer()

    if (content === undefined)
      expect(fs.existsSync(lastBuildPath)).toBe(false)
    else
      expect(fs.readFileSync(lastBuildPath, 'utf8')).toBe(content)
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
