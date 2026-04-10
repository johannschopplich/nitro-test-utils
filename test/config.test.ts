import type { ResolvedNitroTestConfig } from '../src/config'
import { describe, expect, it } from 'vitest'
import { defineConfig } from '../src/config'

describe('defineConfig', async () => {
  describe('rerunOnSourceChanges', () => {
    it('watches source directory by default', async () => {
      const config = await defineConfig()

      expect(config.test?.forceRerunTriggers).toContain(`${process.cwd()}/**/*.ts`)
    })

    it('skips source watching when disabled', async () => {
      const config = await defineConfig({}, {
        rerunOnSourceChanges: false,
      })

      expect(config.test?.forceRerunTriggers).not.toContain(`${process.cwd()}/**/*.ts`)
    })

    it('watches dev build output for global dev mode', async () => {
      const config = await defineConfig({}, { global: true })

      expect(config.test?.forceRerunTriggers).toEqual(
        expect.arrayContaining([expect.stringContaining('.nitro/dev/index.mjs')]),
      )
    })

    it('watches production build output for global production mode', async () => {
      const config = await defineConfig({}, {
        global: { mode: 'production' },
      })

      expect(config.test?.forceRerunTriggers).toEqual(
        expect.arrayContaining([expect.stringContaining('.output/server/index.mjs')]),
      )
    })
  })

  describe('global', () => {
    it('configures globalSetup when enabled', async () => {
      const config = await defineConfig({}, { global: true })

      expect(config.test?.globalSetup).toEqual([expect.stringContaining('setup.mjs')])
      expect((config.test as { nitro: ResolvedNitroTestConfig })?.nitro?.global).toEqual({ rootDir: undefined, mode: undefined, preset: undefined })
    })

    it('passes through custom options', async () => {
      const config = await defineConfig({}, {
        global: { rootDir: '/custom', mode: 'production', preset: 'node-server' },
      })

      expect((config.test as { nitro: ResolvedNitroTestConfig })?.nitro?.global).toEqual({ rootDir: '/custom', mode: 'production', preset: 'node-server' })
    })

    it('runs the user globalSetup before the nitro server starts', async () => {
      const [nitroSetup] = (await defineConfig({}, { global: true })).test?.globalSetup as string[]

      const config = await defineConfig(
        { test: { globalSetup: 'test/user-setup.ts' } },
        { global: true },
      )
      const setups = config.test?.globalSetup as string[]

      expect(setups).toContain('test/user-setup.ts')
      expect(setups).toContain(nitroSetup)
      expect(setups.indexOf('test/user-setup.ts')).toBeLessThan(setups.indexOf(nitroSetup))
    })

    it('accepts multiple user globalSetups alongside the nitro one', async () => {
      const [nitroSetup] = (await defineConfig({}, { global: true })).test?.globalSetup as string[]

      const config = await defineConfig(
        { test: { globalSetup: ['test/a.ts', 'test/b.ts'] } },
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
