import type { ResolvedNitroTestConfig } from '../src/config'
import * as path from 'node:path'
import process from 'node:process'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { defineConfig } from '../src/config'
import { createTempDir } from './utils'

describe('defineConfig', async () => {
  describe('rerunOnSourceChanges', () => {
    it('watches source directory by default', async () => {
      const config = await defineConfig()

      expect(config.test?.forceRerunTriggers).toContain(`${process.cwd()}/**/*.ts`)
    })

    it('leaves .env out of the Vitest process', async () => {
      const cwd = createTempDir({ '.env': 'NITRO_TEST_UTILS_LEAKED=true' })
      const originalCwd = process.cwd()
      process.chdir(cwd)
      // Unstubbing removes the value in case `defineConfig` loads it.
      vi.stubEnv('NITRO_TEST_UTILS_LEAKED', undefined)
      onTestFinished(() => {
        process.chdir(originalCwd)
        vi.unstubAllEnvs()
      })

      await defineConfig()

      expect(process.env.NITRO_TEST_UTILS_LEAKED).toBeUndefined()
    })

    it('skips source watching when disabled', async () => {
      const config = await defineConfig({}, {
        rerunOnSourceChanges: false,
      })

      expect(config.test?.forceRerunTriggers).not.toContain(`${process.cwd()}/**/*.ts`)
    })

    it('watches dev build output for global dev mode', async () => {
      const config = await defineConfig({}, { global: true })

      expect(config.test?.forceRerunTriggers).toContain(
        path.resolve(process.cwd(), 'node_modules/.nitro/dev/index.mjs'),
      )
    })

    it('watches production build output for global production mode', async () => {
      const config = await defineConfig({}, {
        global: { mode: 'production' },
      })

      expect(config.test?.forceRerunTriggers).toContain(
        path.resolve(process.cwd(), 'node_modules/.nitro/output/standard/0/server/index.mjs'),
      )
    })

    it('watches the production build output of the node-server preset', async () => {
      const config = await defineConfig({}, {
        global: { mode: 'production', preset: 'node-server' },
      })

      expect(config.test?.forceRerunTriggers).toContain(
        path.resolve(process.cwd(), 'node_modules/.nitro/output/node-server/0/server/index.mjs'),
      )
    })

    it('watches dev build output for a custom rootDir', async () => {
      const config = await defineConfig({}, {
        global: { rootDir: '/custom' },
      })

      expect(config.test?.forceRerunTriggers).toContain(
        path.resolve('/custom', 'node_modules/.nitro/dev/index.mjs'),
      )
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
      expect(config.test?.forceRerunTriggers).toContain(`${process.cwd()}/**/*.ts`)
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
