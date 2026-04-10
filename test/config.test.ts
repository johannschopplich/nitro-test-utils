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

      expect(config.test?.globalSetup).toHaveLength(1)
      expect((config.test as { nitro: ResolvedNitroTestConfig })?.nitro?.global).toEqual({ rootDir: undefined, mode: undefined, preset: undefined })
    })

    it('passes through custom options', async () => {
      const config = await defineConfig({}, {
        global: { rootDir: '/custom', mode: 'production', preset: 'node-server' },
      })

      expect(config.test?.globalSetup).toHaveLength(1)
      expect((config.test as { nitro: ResolvedNitroTestConfig })?.nitro?.global).toEqual({ rootDir: '/custom', mode: 'production', preset: 'node-server' })
    })

    it('does not configure globalSetup when not set', async () => {
      const config = await defineConfig({})

      expect(config.test?.globalSetup).toBeUndefined()
      expect((config.test as { nitro: ResolvedNitroTestConfig })?.nitro?.global).toBeUndefined()
    })

    it('preserves a user globalSetup string and appends nitro setup last', async () => {
      const config = await defineConfig(
        { test: { globalSetup: 'test/user-setup.ts' } },
        { global: true },
      )

      const setups = config.test?.globalSetup as string[]
      expect(setups).toHaveLength(2)
      expect(setups[0]).toBe('test/user-setup.ts')
      expect(setups[1]).toMatch(/setup\.m?js$/)
    })

    it('preserves a user globalSetup array and appends nitro setup last', async () => {
      const config = await defineConfig(
        { test: { globalSetup: ['test/a.ts', 'test/b.ts'] } },
        { global: true },
      )

      const setups = config.test?.globalSetup as string[]
      expect(setups).toHaveLength(3)
      expect(setups[0]).toBe('test/a.ts')
      expect(setups[1]).toBe('test/b.ts')
      expect(setups[2]).toMatch(/setup\.m?js$/)
    })

    it('preserves a user globalSetup when global is not set', async () => {
      const config = await defineConfig({
        test: { globalSetup: 'test/user-setup.ts' },
      })

      expect(config.test?.globalSetup).toEqual(['test/user-setup.ts'])
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
