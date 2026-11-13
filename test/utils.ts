import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { x } from 'tinyexec'
import { onTestFinished } from 'vitest'

export interface FileMap {
  [relativePath: string]: string
}

export interface VitestRun {
  statusByTitle: Record<string, string>
  /** The default reporter's output, which holds the errors of a suite's hooks that the JSON report leaves out. */
  stderr: string
}

export const packageDir: string = path.resolve(import.meta.dirname, '..')

/**
 * Writes the files into a temporary directory and removes it once the test finishes.
 *
 * @remarks
 * `onTestFinished` runs after every `afterEach` hook, so a Nitro app built from the directory has
 * stopped by then.
 */
export function createTempDir(files: FileMap = {}): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nitro-test-utils-'))
  onTestFinished(() => fs.rmSync(directory, { recursive: true, force: true }))

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, contents, 'utf-8')
  }

  return directory
}

export function createTempApp(files: FileMap): string {
  return createTempDir({ 'nitro.config.ts': 'export default { serverDir: \'.\' }', ...files })
}

/**
 * Runs Vitest in a separate process, so a fixture's failing hook does not fail the calling suite.
 *
 * @remarks
 * Runs from the package, since a production build under `NITRO_BUILDER=rollup` hangs from a cwd
 * outside it.
 */
export async function runVitest(fixtureDir: string): Promise<VitestRun> {
  fs.symlinkSync(path.join(packageDir, 'node_modules'), path.join(fixtureDir, 'node_modules'))
  const reportPath = path.join(fixtureDir, 'report.json')

  const { stderr } = await x(
    'vitest',
    [
      'run',
      '--root',
      fixtureDir,
      '--reporter=default',
      '--reporter=json',
      `--outputFile.json=${reportPath}`,
    ],
    {
      nodeOptions: { cwd: packageDir },
    },
  )
  const { testResults } = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
    testResults: { assertionResults: { title: string, status: string }[] }[]
  }

  return {
    statusByTitle: Object.fromEntries(
      testResults.flatMap(result => result.assertionResults).map(result => [result.title, result.status]),
    ),
    stderr,
  }
}
