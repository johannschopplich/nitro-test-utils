import type { UserConfig } from 'vite'
import * as path from 'node:path'
// eslint-disable-next-line antfu/no-import-dist
import { defineConfig } from './dist/config.mjs'

const config: Promise<UserConfig> = defineConfig(
  {
    test: {
      name: 'global',
      dir: './test/global',
      globalSetup: './test/global/user-setup.ts',
    },
  },
  {
    global: {
      rootDir: path.resolve(import.meta.dirname, 'test/basic-app'),
    },
  },
)

export default config
