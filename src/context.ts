import type { NitroOptions } from 'nitro/types'
import type { NitroTestContext, NitroTestOptions } from './types'
import * as fs from 'node:fs'
import process from 'node:process'
import * as dotenv from 'dotenv'
import { createNitro } from 'nitro/builder'
import { join, resolve } from 'pathe'

let currentContext: NitroTestContext | undefined

export async function createTestContext(options: NitroTestOptions & { isGlobal?: boolean }): Promise<NitroTestContext> {
  const {
    mode = 'development',
    rootDir = process.cwd(),
    isGlobal = false,
  } = options
  const isDev = mode === 'development'
  const preset: NitroOptions['preset'] = isDev ? 'nitro-dev' : 'node-middleware'
  const outDir = resolve(rootDir, '.output')

  setupDotenv({ rootDir })

  const ctx: NitroTestContext = {
    options: {
      rootDir,
      mode,
    },
    isGlobal,
    isDev,
    nitro: await createNitro({
      preset,
      dev: isDev,
      rootDir,
      buildDir: join(outDir, '.nitro'),
      serveStatic: !isDev,
      output: {
        dir: outDir,
      },
      replace: {
        'import.meta.test': JSON.stringify(true),
      },
    }),
  }

  provideTestContext(ctx)

  return ctx
}

export function injectTestContext(): NitroTestContext | undefined {
  return currentContext
}

export function provideTestContext(context: NitroTestContext): void {
  currentContext = context
}

export function clearTestContext(): void {
  currentContext = undefined
}

export function setupDotenv({
  rootDir = process.cwd(),
  fileName = '.env.test',
  override = true,
}: {
  rootDir?: string
  fileName?: string
  override?: boolean
} = {}): Record<string, string> {
  const environment: Record<string, string> = Object.create(null)
  const dotenvFile = resolve(rootDir, fileName)

  if (fs.existsSync(dotenvFile)) {
    const parsed = dotenv.parse(fs.readFileSync(dotenvFile, 'utf8'))
    Object.assign(environment, parsed)
  }

  // Fill environment variables
  for (const key in environment) {
    if (override || process.env[key] === undefined)
      process.env[key] = environment[key]
  }

  return environment
}
