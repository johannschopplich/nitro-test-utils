import type { PreviewInstance } from 'nitro/builder'
import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { getRandomPort, waitForPort } from 'get-port-please'
import { proxyFetch } from 'httpxy'

const HOST = '127.0.0.1'
const EXIT_TIMEOUT = 5_000

/**
 * Runs the Cloudflare build in `wrangler dev` and proxies requests to it.
 *
 * @remarks
 * Replaces Nitro's `startPreview` for Cloudflare presets, which spawns `npx wrangler`. Where
 * `/bin/sh` is `dash`, as on Debian and Ubuntu, `npx` runs it behind a shell that doesn't forward
 * SIGTERM: `wrangler` and `workerd` outlive the test run and keep Vitest's worker pipes open.
 * Wrangler's own bin forwards the signal to its CLI.
 */
export async function startWrangler(rootDir: string, wranglerBin: string): Promise<PreviewInstance> {
  const port = await getRandomPort(HOST)

  // `wrangler` picks up the build through the deploy redirect the build wrote into the root.
  const child = spawn(process.execPath, [
    wranglerBin,
    'dev',
    '--ip',
    HOST,
    '--port',
    String(port),
  ], {
    cwd: rootDir,
    stdio: 'inherit',
  })
  const childExit = new Promise<void>(resolve => child.once('exit', () => resolve()))

  try {
    await Promise.race([
      // Same retry budget as Nitro's `runPreviewCommand`.
      waitForPort(port, { host: HOST, retries: 20, delay: 500 }).catch((error) => {
        throw new Error(`\`wrangler dev\` didn't start listening on port ${port}.`, { cause: error })
      }),
      childExit.then(() => {
        throw new Error('`wrangler dev` exited before it was ready.')
      }),
    ])
  }
  catch (error) {
    await stopChild(child, childExit)
    throw error
  }

  return {
    // httpxy reads the method, headers, and body from the request, but not its abort signal.
    fetch: request => proxyFetch({ host: HOST, port }, request, { signal: request.signal }),
    close: () => stopChild(child, childExit),
  }
}

async function stopChild(child: ChildProcess, childExit: Promise<void>): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null)
    return

  child.kill('SIGTERM')
  const timeout = setTimeout(() => child.kill('SIGKILL'), EXIT_TIMEOUT)
  await childExit
  clearTimeout(timeout)
}
