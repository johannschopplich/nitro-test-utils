import type { ViteUserConfig as UserConfig } from 'vitest/config'
import type { ResolvedNitroTestConfig } from '../src/config'
import * as path from 'node:path'
import { resolveModulePath } from 'exsolve'
import { describe, expect, it } from 'vitest'
import { defineConfig } from '../src/config'

const { default: picomatch } = await import(resolveModulePath('picomatch', {
  from: resolveModulePath('vitest/package.json'),
}))

describe('defineConfig', async () => {
  describe('rerunOnSourceChanges', () => {
    it.each([
      'test/basic-app/api/health.get.ts',
      'test/basic-app/routes/index.mjs',
    ])('reruns on a change to %s', async (filePath) => {
      const config = await defineConfig()

      expect(rerunsOn(config, path.resolve(filePath))).toBe(true)
    })

    it('skips source watching when disabled', async () => {
      const config = await defineConfig({}, {
        rerunOnSourceChanges: false,
      })

      expect(rerunsOn(config, path.resolve('test/basic-app/api/health.get.ts'))).toBe(false)
    })

    it.each([
      'index.test.ts',
      'index.spec.ts',
      'index.test-d.ts',
      'index.spec-d.ts',
    ])('leaves %s to its own rerun', async (fileName) => {
      const config = await defineConfig()

      expect(rerunsOn(config, path.resolve('test/basic-app/api', fileName))).toBe(false)
    })

    it.each([
      'coverage/prettify.js',
      '.output/server/index.mjs',
      'test/basic-app/coverage/prettify.js',
      'test/cloudflare-app/.wrangler/tmp/bundle/index.js',
    ])('leaves out %s', async (filePath) => {
      const config = await defineConfig()

      expect(rerunsOn(config, path.resolve(filePath))).toBe(false)
    })
  })

  describe('global', () => {
    it('configures globalSetup when enabled', async () => {
      const config = await defineConfig({}, { global: true })

      expect(config.test?.globalSetup).toEqual([
        expect.stringContaining('global-setup.mjs'),
      ])
      expect((config.test as { nitro: ResolvedNitroTestConfig })?.nitro?.global).toEqual({ rootDir: undefined, mode: undefined, preset: undefined })
    })

    it('passes through custom options', async () => {
      const config = await defineConfig({}, {
        global: { rootDir: '/custom', mode: 'production', preset: 'node-server' },
      })

      expect((config.test as { nitro: ResolvedNitroTestConfig })?.nitro?.global).toEqual({ rootDir: '/custom', mode: 'production', preset: 'node-server' })
    })

    it('configures worker-setup as a setupFile when global is enabled', async () => {
      const config = await defineConfig({}, { global: true })

      expect(config.test?.setupFiles).toEqual([
        expect.stringContaining('worker-setup.mjs'),
      ])
    })

    it('preserves user setupFiles alongside the worker one', async () => {
      const config = await defineConfig(
        {
          test: {
            setupFiles: ['test/a.ts', 'test/b.ts'],
          },
        },
        { global: true },
      )
      const setupFiles = config.test?.setupFiles as string[]

      expect(setupFiles).toContain('test/a.ts')
      expect(setupFiles).toContain('test/b.ts')
      expect(setupFiles).toEqual(expect.arrayContaining([
        expect.stringContaining('worker-setup.mjs'),
      ]))
    })

    it('runs the user globalSetup before the nitro server starts', async () => {
      const nitroSetup = ((await defineConfig({}, { global: true })).test?.globalSetup as string[])[0]!

      const config = await defineConfig(
        {
          test: { globalSetup: 'test/user-setup.ts' },
        },
        { global: true },
      )
      const setups = config.test?.globalSetup as string[]

      expect(setups).toContain('test/user-setup.ts')
      expect(setups).toContain(nitroSetup)
      expect(setups.indexOf('test/user-setup.ts')).toBeLessThan(setups.indexOf(nitroSetup))
    })

    it('accepts multiple user globalSetups alongside the nitro one', async () => {
      const nitroSetup = ((await defineConfig({}, { global: true })).test?.globalSetup as string[])[0]!

      const config = await defineConfig(
        {
          test: {
            globalSetup: ['test/a.ts', 'test/b.ts'],
          },
        },
        { global: true },
      )
      const setups = config.test?.globalSetup as string[]

      expect(setups).toContain('test/a.ts')
      expect(setups).toContain('test/b.ts')
      expect(setups).toContain(nitroSetup)
      expect(setups.indexOf('test/a.ts')).toBeLessThan(setups.indexOf(nitroSetup))
      expect(setups.indexOf('test/b.ts')).toBeLessThan(setups.indexOf(nitroSetup))
    })

    it('does not configure globalSetup when not set', async () => {
      const config = await defineConfig({})

      expect(config.test?.globalSetup).toBeUndefined()
      expect((config.test as { nitro: ResolvedNitroTestConfig })?.nitro?.global).toBeUndefined()
    })

    it('does not inject the nitro globalSetup when global is not set', async () => {
      const config = await defineConfig({
        test: { globalSetup: 'test/user-setup.ts' },
      })

      expect(config.test?.globalSetup).toBe('test/user-setup.ts')
    })
  })

  describe('output', () => {
    it('preserves nitro options in resolved config', async () => {
      const config = await defineConfig({}, {
        rerunOnSourceChanges: false,
      })

      expect((config.test as { nitro: ResolvedNitroTestConfig })?.nitro?.rerunOnSourceChanges).toBe(false)
    })

    it('merges with user configuration', async () => {
      const config = await defineConfig({
        test: {
          forceRerunTriggers: ['test/foo.test.ts'],
        },
      })

      expect(config.test?.forceRerunTriggers).toContain('test/foo.test.ts')
      expect(rerunsOn(config, path.resolve('test/basic-app/api/health.get.ts'))).toBe(true)
    })

    it('passes through custom vitest config', async () => {
      const config = await defineConfig({
        test: {
          dir: './tests',
        },
      })

      expect(config.test?.dir).toBe('./tests')
    })
  })
})

// Matches a changed file against `forceRerunTriggers` the way Vitest's watcher does.
function rerunsOn(config: UserConfig, filePath: string): boolean {
  return picomatch.isMatch(filePath, config.test?.forceRerunTriggers ?? [], { dot: true })
}
