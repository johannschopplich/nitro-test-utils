import { describe, expect, it } from 'vitest'
import { defineConfig } from '../src/config'

describe('config', async () => {
  it('should add the Nitro source directory to force rerun triggers', async () => {
    const config = await defineConfig()

    expect(config.test?.forceRerunTriggers).toContain(`${process.cwd()}/**/*.ts`)
  })

  it('should remove the Nitro source directory from force rerun triggers when disabled', async () => {
    const config = await defineConfig({
      nitro: {
        forceRerunTriggersOnSrcDir: false,
      },
    })

    expect(config.test?.forceRerunTriggers).not.toContain(`${process.cwd()}/**/*.ts`)
  })

  it('should merge with user configuration', async () => {
    const config = await defineConfig({
      test: {
        forceRerunTriggers: ['test/foo.test.ts'],
      },
    })

    expect(config.test?.forceRerunTriggers?.length).toBe(2)
    expect(config.test?.forceRerunTriggers).toContain('test/foo.test.ts')
    expect(config.test?.forceRerunTriggers).toContain(`${process.cwd()}/**/*.ts`)
  })
})
