import type { UserConfig } from 'vite'
// eslint-disable-next-line antfu/no-import-dist
import { defineConfig } from './dist/config.mjs'

const config: UserConfig = await defineConfig()

export default config
