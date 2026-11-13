import type { ViteUserConfig as UserConfig } from 'vitest/config'
import type { NitroTestOptions } from './types'
import * as path from 'node:path'
import process from 'node:process'
import { mergeConfig, normalizePath } from 'vite'
import { configDefaults, defineConfig as defineVitestConfig } from 'vitest/config'

// Source files outside dot directories and directories whose names start with `coverage`, at any
// depth, which hold coverage reports and generated files. Vite's watcher already ignores
// `node_modules`. Test files rerun on their own, and a trigger would rerun every file instead.
const SOURCE_FILE_PATTERN = '{+(!(coverage|.*)/),}!(*.test|*.spec|*.test-d|*.spec-d).{js,mjs,cjs,ts,mts,cts,tsx,jsx}'

export interface NitroTestConfig {
  /**
   * Whether to rerun all tests when a source file under Vitest's working directory changes.
   *
   * @default true
   */
  rerunOnSourceChanges?: boolean

  /**
   * Options for a global Nitro server instance for all tests.
   * Set to `true` to enable with default options.
   */
  global?: boolean | NitroTestOptions
}

export interface ResolvedNitroTestConfig {
  rerunOnSourceChanges: boolean
  global?: NitroTestOptions
}

export async function defineConfig(userConfig: UserConfig = {}, testConfig: NitroTestConfig = {}): Promise<UserConfig> {
  const resolvedGlobalConfig = testConfig.global === true
    ? {}
    : testConfig.global || undefined
  const resolvedTestConfig: ResolvedNitroTestConfig = {
    rerunOnSourceChanges: testConfig.rerunOnSourceChanges ?? true,
    global: resolvedGlobalConfig
      ? {
          rootDir: resolvedGlobalConfig.rootDir || undefined,
          mode: resolvedGlobalConfig.mode || undefined,
          preset: resolvedGlobalConfig.preset || undefined,
        }
      : undefined,
  }

  const userConfigOverrides = defineVitestConfig({
    test: {
      // With `isolate: false` and `maxWorkers: 1`, the Nitro app initialized by
      // `worker-setup` persists across test files in the same worker, so we pay the build
      // cost exactly once per run.
      isolate: false,
      maxWorkers: 1,
      forceRerunTriggers: [
        ...configDefaults.forceRerunTriggers,
        ...resolveSourceRerunTriggers(resolvedTestConfig),
      ],
      // @ts-expect-error: `nitro` is a custom property used internally by the setup script.
      nitro: resolvedTestConfig,
    },
  }) as UserConfig

  const mergedConfig: UserConfig = mergeConfig(userConfig, userConfigOverrides)
  mergedConfig.test ??= {}
  mergedConfig.test.globalSetup = resolveGlobalSetup(userConfig.test?.globalSetup, resolvedTestConfig)
  mergedConfig.test.setupFiles = resolveSetupFiles(userConfig.test?.setupFiles, resolvedTestConfig)

  return mergedConfig
}

function resolveGlobalSetup(
  userGlobalSetup: string | string[] | undefined,
  config: ResolvedNitroTestConfig,
): string | string[] | undefined {
  if (!config.global)
    return userGlobalSetup

  const userSetups = userGlobalSetup
    ? (Array.isArray(userGlobalSetup)
        ? [...userGlobalSetup]
        : [userGlobalSetup])
    : []

  return [
    ...userSetups,
    path.join(import.meta.dirname, 'global-setup.mjs'),
  ]
}

function resolveSetupFiles(
  userSetupFiles: string | string[] | undefined,
  config: ResolvedNitroTestConfig,
): string | string[] | undefined {
  if (!config.global)
    return userSetupFiles

  const userSetups = userSetupFiles
    ? (Array.isArray(userSetupFiles)
        ? [...userSetupFiles]
        : [userSetupFiles])
    : []

  return [
    ...userSetups,
    path.join(import.meta.dirname, 'worker-setup.mjs'),
  ]
}

function resolveSourceRerunTriggers(config: ResolvedNitroTestConfig): string[] {
  if (!config.rerunOnSourceChanges)
    return []

  // Vitest matches `forceRerunTriggers` against absolute paths with forward slashes, and picomatch
  // reads a backslash as an escape.
  return [
    path.posix.join(normalizePath(process.cwd()), SOURCE_FILE_PATTERN),
  ]
}
