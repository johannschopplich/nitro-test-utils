import process from 'node:process'
import { existsSync, readFileSync } from 'node:fs'
import { type NitroOptions, createNitro } from 'nitropack'
import { resolve } from 'pathe'
import * as dotenv from 'dotenv'
import type { NitroTestContext } from './types'
import { NITRO_OUTPUT_DIR } from './constants'

let currentContext: NitroTestContext | undefined

export async function createTestContext({
  preset = 'nitro-dev',
  rootDir = process.cwd(),
}: {
  preset?: NitroOptions['preset']
  rootDir?: string
} = {}): Promise<NitroTestContext> {
  setupDotenv({ rootDir })

  const isDev = preset === 'nitro-dev'
  const outDir = resolve(rootDir, NITRO_OUTPUT_DIR)
  const ctx: NitroTestContext = {
    preset,
    isDev,
    nitro: await createNitro({
      preset,
      dev: isDev,
      rootDir,
      buildDir: resolve(outDir, '.nitro'),
      serveStatic: !isDev,
      output: {
        dir: outDir,
      },
      timing: true,
      replace: {
        'import.meta.test': JSON.stringify(true),
      },
    }),
  }

  return setTestContext(ctx)
}

export function useTestContext(): NitroTestContext {
  if (!currentContext) {
    throw new Error('No context is available. (Forgot calling setup or createContext?)')
  }
  return currentContext
}

export function setTestContext(context: NitroTestContext): NitroTestContext {
  currentContext = context
  return context
}

export function setupDotenv({
  rootDir = process.cwd(),
  fileName = '.env.test',
  override = true,
}: {
  rootDir?: string
  fileName?: string
  override?: boolean
} = {}) {
  const environment: Record<string, string> = Object.create(null)
  const dotenvFile = resolve(rootDir, fileName)

  if (existsSync(dotenvFile)) {
    const parsed = dotenv.parse(readFileSync(dotenvFile, 'utf8'))
    Object.assign(environment, parsed)
  }

  // Fill environment variables
  for (const key in environment) {
    if (override || process.env[key] === undefined)
      process.env[key] = environment[key]
  }

  return environment
}
