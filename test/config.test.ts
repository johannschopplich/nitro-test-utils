import { describe, expect, it } from 'vitest'
import { defineConfig } from '../src/config'

describe('defineConfig', async () => {
  describe('rerunOnSourceChanges', () => {
    it('should add source directory to force rerun triggers by default', async () => {
      const config = await defineConfig()

      expect(config.test?.forceRerunTriggers).toContain(`${process.cwd()}/**/*.ts`)
    })

    it('should exclude source directory when disabled', async () => {
      const config = await defineConfig({
        nitro: {
          rerunOnSourceChanges: false,
        },
      })

      expect(config.test?.forceRerunTriggers).not.toContain(`${process.cwd()}/**/*.ts`)
    })
  })

  describe('global', () => {
    it('should configure globalSetup when enabled', async () => {
      const config = await defineConfig({
        nitro: { global: true },
      })

      expect(config.test?.globalSetup).toHaveLength(1)
      expect(config.nitro?.global).toEqual({ rootDir: undefined, mode: undefined })
    })

    it('should pass through custom options', async () => {
      const config = await defineConfig({
        nitro: { global: { rootDir: '/custom', mode: 'production' } },
      })

      expect(config.test?.globalSetup).toHaveLength(1)
      expect(config.nitro?.global).toEqual({ rootDir: '/custom', mode: 'production' })
    })

    it('should not configure globalSetup when not set', async () => {
      const config = await defineConfig({})

      expect(config.test?.globalSetup).toBeUndefined()
      expect(config.nitro?.global).toBeUndefined()
    })
  })

  describe('output', () => {
    it('should include nitro config', async () => {
      const config = await defineConfig({
        nitro: { rerunOnSourceChanges: false },
      })

      expect(config.nitro).toBeDefined()
      expect(config.nitro?.rerunOnSourceChanges).toBe(false)
    })

    it('should merge with user configuration', async () => {
      const config = await defineConfig({
        test: {
          forceRerunTriggers: ['test/foo.test.ts'],
        },
      })

      expect(config.test?.forceRerunTriggers?.length).toMatchInlineSnapshot(`5`)
      expect(config.test?.forceRerunTriggers).toContain('test/foo.test.ts')
      expect(config.test?.forceRerunTriggers).toContain(`${process.cwd()}/**/*.ts`)
    })
  })
})
