import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { $serverFetch, setup } from '../src'
import { createTempApp, createTempDir, packageDir, runVitest } from './utils'

describe('setup', () => {
  it('rejects a nested setup() in a suite with a running app and keeps the outer one', { timeout: 30_000 }, async () => {
    const appRootDir = path.resolve(import.meta.dirname, 'production-app')
    const fixtureDir = createTempDir({
      'nested.test.ts': createFixture([
        `describe('outer', async () => {`,
        `  await setup({ rootDir: ${JSON.stringify(appRootDir)}, mode: 'production' })`,
        `  describe('inner', async () => {`,
        `    await setup({ rootDir: ${JSON.stringify(appRootDir)}, mode: 'production' })`,
        `    it('runs', () => {})`,
        `  })`,
        `  it('serves the outer app', async () => {`,
        `    const { data } = await $serverFetch('/')`,
        `    expect(data).toBe('Hello, production build!')`,
        `  })`,
        `})`,
      ]),
    })
    const { statusByTitle, stderr } = await runVitest(fixtureDir)

    expect(statusByTitle).toEqual({ 'runs': 'skipped', 'serves the outer app': 'passed' })
    expect(stderr).toContain('A Nitro app is already running for an enclosing or concurrent suite.')
  })

  it('rejects a concurrent sibling suite with setup()', { timeout: 30_000 }, async () => {
    const firstRootDir = createTempApp({ 'routes/index.ts': 'export default () => \'first\'' })
    const secondRootDir = createTempApp({ 'routes/index.ts': 'export default () => \'second\'' })
    const fixtureDir = createTempDir({
      'concurrent.test.ts': createFixture([
        `describe.concurrent('outer', () => {`,
        `  describe('first', async () => {`,
        `    await setup({ rootDir: ${JSON.stringify(firstRootDir)} })`,
        `    it('serves the first app', async () => {`,
        `      expect((await $serverFetch('/')).data).toBe('first')`,
        `    })`,
        `  })`,
        `  describe('second', async () => {`,
        `    await setup({ rootDir: ${JSON.stringify(secondRootDir)} })`,
        `    it('serves the second app', async () => {`,
        `      expect((await $serverFetch('/')).data).toBe('second')`,
        `    })`,
        `  })`,
        `})`,
      ]),
    })

    const { statusByTitle, stderr } = await runVitest(fixtureDir)

    expect(statusByTitle).toEqual({ 'serves the first app': 'passed', 'serves the second app': 'skipped' })
    expect(stderr).toContain('A Nitro app is already running for an enclosing or concurrent suite.')
  })

  it('gives the next suite its own app after a beforeAll timeout', { timeout: 30_000 }, async () => {
    const nextRootDir = createTempApp({ 'routes/index.ts': 'export default () => \'next\'' })
    const slowRootDir = createTempDir({
      'nitro.config.ts': 'await new Promise(resolve => setTimeout(resolve, 2500))\nexport default { serverDir: \'.\' }',
      'routes/index.ts': 'export default () => \'slow\'',
    })
    const fixtureDir = createTempDir({
      'vitest.config.ts': `export default { test: { hookTimeout: 2000 } }`,
      'timeout.test.ts': createFixture([
        `describe('slow', async () => {`,
        `  await setup({ rootDir: ${JSON.stringify(slowRootDir)} })`,
        `  it('serves the slow app', () => {})`,
        `})`,
        `describe('next', async () => {`,
        `  await setup({ rootDir: ${JSON.stringify(nextRootDir)} })`,
        `  it('serves the next app', async () => {`,
        // Gives the slow app's start, which outlives its timed-out hook, the time to finish.
        `    await new Promise(resolve => setTimeout(resolve, 2000))`,
        `    expect((await $serverFetch('/')).data).toBe('next')`,
        `  })`,
        `})`,
      ]),
    })

    const { statusByTitle } = await runVitest(fixtureDir)

    expect(statusByTitle['serves the next app']).toBe('passed')
  })

  it('gives the next suite its own app when a close hook throws', { timeout: 30_000 }, async () => {
    const nextRootDir = createTempApp({ 'routes/index.ts': 'export default () => \'next\'' })
    const failingCloseRootDir = createTempDir({
      'nitro.config.ts': 'export default { serverDir: \'.\', hooks: { close() { throw new Error(\'Close failed\') } } }',
      'routes/index.ts': 'export default () => \'failing close\'',
    })
    const fixtureDir = createTempDir({
      'close.test.ts': createFixture([
        `describe('failing close', async () => {`,
        `  await setup({ rootDir: ${JSON.stringify(failingCloseRootDir)} })`,
        `  it('serves the failing close app', () => {})`,
        `})`,
        `describe('next', async () => {`,
        `  await setup({ rootDir: ${JSON.stringify(nextRootDir)} })`,
        `  it('serves the next app', async () => {`,
        `    expect((await $serverFetch('/')).data).toBe('next')`,
        `  })`,
        `})`,
      ]),
    })

    const { statusByTitle } = await runVitest(fixtureDir)

    expect(statusByTitle['serves the next app']).toBe('passed')
  })

  it('restores process.env and the dev build info once a suite ends', { timeout: 30_000 }, async () => {
    // A directory where the file belongs, so reading the dev build info throws.
    const unreadableRootDir = createTempApp({ 'node_modules/.nitro/nitro.dev.json/.gitkeep': '' })
    const devRootDir = createTempApp({
      'routes/index.ts': 'export default () => \'ok\'',
      '.env.test': 'NITRO_TEST_UTILS_DEV=loaded',
    })
    const devBuildInfoPath = path.join(devRootDir, 'node_modules/.nitro/nitro.dev.json')
    fs.mkdirSync(path.dirname(devBuildInfoPath), { recursive: true })
    fs.writeFileSync(devBuildInfoPath, '{"envName":"development"}')
    const brokenRootDir = createTempApp({
      'nitro.config.ts': 'throw new Error(\'Broken config\')',
      '.env.test': 'NITRO_TEST_UTILS_BROKEN=loaded',
    })
    const failingCloseRootDir = createTempApp({
      'nitro.config.ts': 'export default { serverDir: \'.\', hooks: { close() { throw new Error(\'Close failed\') } } }',
      'routes/index.ts': 'export default () => \'ok\'',
      '.env.test': 'NITRO_TEST_UTILS_FAILING_CLOSE=loaded',
    })
    const newerBuildInfoPath = path.join(failingCloseRootDir, 'node_modules/.nitro/nitro.dev.json')
    const fixtureDir = createTempDir({
      'cleanup.test.ts': createFixture([
        `import * as fs from 'node:fs'`,
        `describe('unreadable', async () => {`,
        `  await setup({ rootDir: ${JSON.stringify(unreadableRootDir)} })`,
        `  it('never starts', () => {})`,
        `})`,
        `describe('dev', async () => {`,
        `  await setup({ rootDir: ${JSON.stringify(devRootDir)} })`,
        `  it('loads .env.test of the dev app', async () => {`,
        `    await $serverFetch('/')`,
        `    expect(process.env.NITRO_TEST_UTILS_DEV).toBe('loaded')`,
        `  })`,
        `  it('records the dev build info under the test env name', async () => {`,
        `    await expect.poll(() => JSON.parse(fs.readFileSync(${JSON.stringify(devBuildInfoPath)}, 'utf8')).envName).toBe('test')`,
        `  })`,
        `})`,
        `it('unsets the variables of the dev app', () => expect(process.env.NITRO_TEST_UTILS_DEV).toBeUndefined())`,
        `it('restores the earlier dev build info', () => {`,
        `  expect(fs.readFileSync(${JSON.stringify(devBuildInfoPath)}, 'utf8')).toBe('{"envName":"development"}')`,
        `})`,
        `describe('broken', async () => {`,
        `  await setup({ rootDir: ${JSON.stringify(brokenRootDir)} })`,
        `  it('never runs', () => {})`,
        `})`,
        `it('unsets the variables of the broken app', () => expect(process.env.NITRO_TEST_UTILS_BROKEN).toBeUndefined())`,
        `describe('failing close', async () => {`,
        `  await setup({ rootDir: ${JSON.stringify(failingCloseRootDir)} })`,
        `  it('writes a newer dev build info', async () => {`,
        `    await $serverFetch('/')`,
        `    fs.writeFileSync(${JSON.stringify(newerBuildInfoPath)}, '{"envName":"development"}')`,
        `  })`,
        `})`,
        `it('unsets the variables of the failing close app', () => expect(process.env.NITRO_TEST_UTILS_FAILING_CLOSE).toBeUndefined())`,
        `it('keeps the newer dev build info', () => {`,
        `  expect(fs.readFileSync(${JSON.stringify(newerBuildInfoPath)}, 'utf8')).toBe('{"envName":"development"}')`,
        `})`,
      ]),
    })

    const { statusByTitle, stderr } = await runVitest(fixtureDir)

    expect(statusByTitle).toEqual({
      'never starts': 'skipped',
      'loads .env.test of the dev app': 'passed',
      'records the dev build info under the test env name': 'passed',
      'unsets the variables of the dev app': 'passed',
      'restores the earlier dev build info': 'passed',
      'never runs': 'skipped',
      'unsets the variables of the broken app': 'passed',
      'writes a newer dev build info': 'passed',
      'unsets the variables of the failing close app': 'passed',
      'keeps the newer dev build info': 'passed',
    })
    expect(stderr).toContain('EISDIR')
    expect(stderr).toContain('Broken config')
    expect(stderr).toContain('Close failed')
  })

  describe('first suite', async () => {
    await setup({
      rootDir: path.resolve(import.meta.dirname, 'basic-app'),
    })

    it('serves the app of its own suite', async () => {
      const { data } = await $serverFetch('/api/health')
      expect(data).toEqual({ ok: true })
    })
  })

  describe('second suite', async () => {
    await setup({
      rootDir: path.resolve(import.meta.dirname, 'production-app'),
      mode: 'production',
    })

    it('serves the app of its own suite', async () => {
      const { data } = await $serverFetch('/')
      expect(data).toBe('Hello, production build!')
    })
  })
})

function createFixture(lines: string[]): string {
  return [
    `import { describe, expect, it } from 'vitest'`,
    `import { $serverFetch, setup } from ${JSON.stringify(path.join(packageDir, 'src/index.ts'))}`,
    ...lines,
  ].join('\n')
}
