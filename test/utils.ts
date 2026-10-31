import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { onTestFinished } from 'vitest'

export interface FileMap {
  [relativePath: string]: string
}

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
