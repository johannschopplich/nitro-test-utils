import * as fs from 'node:fs'
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

  it('restores the wrangler deploy redirect on stop', async () => {
    const redirectPath = path.join(cloudflareRootDir, '.wrangler/deploy/config.json')
    onTestFinished(() => fs.rmSync(redirectPath, { force: true }))

    fs.mkdirSync(path.dirname(redirectPath), { recursive: true })
    fs.writeFileSync(redirectPath, '{"configPath":"../../dist/server/wrangler.json"}')

    await createTestContext({ rootDir: cloudflareRootDir, mode: 'production', preset: 'cloudflare-module' })
    await startServer()
    await stopServer()

    expect(fs.readFileSync(redirectPath, 'utf8')).toBe('{"configPath":"../../dist/server/wrangler.json"}')
  })
})

describe('createTestContext', () => {
  it.each([
    'node-middleware',
    'nodeMiddleware',
    'aws-lambda',
    'cloudflare-pages',
  ])('rejects the %s preset in production mode', async (preset) => {
    await expect(createTestContext({ rootDir, mode: 'production', preset }))
      .rejects
      .toThrow('Production mode supports the "standard", "node-server", "cloudflare-module", and "cloudflare-durable" presets')
  })

  it('rejects a Cloudflare production build without wrangler installed', async () => {
    await expect(createTestContext({ rootDir, mode: 'production', preset: 'cloudflare-module' }))
      .rejects
      .toThrow('needs `wrangler` installed')
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
