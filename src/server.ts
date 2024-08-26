import process, { cwd } from 'node:process'
import { execa } from 'execa'
import { resolve } from 'pathe'
import { getRandomPort, waitForPort } from 'get-port-please'
import type { FetchOptions } from 'ofetch'
import { ofetch } from 'ofetch'
import { joinURL } from 'ufo'
import { useTestContext } from './context'

/**
 * Start the server, both for dev and production.s
 */
export async function startServer() {
  await stopServer()

  const ctx = useTestContext()

  const host = '127.0.0.1'
  const port = await getRandomPort(host)

  ctx.url = `http://${host}:${port}`

  if (ctx.options.dev) {
    ctx.serverProcess = execa('nitro', ['dev'], {
      cwd: ctx.options.rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: String(port),
        HOST: host,
        NODE_ENV: 'development',
        TEST: String(true),
      },
    })

    await waitForPort(port, { retries: 32, host })

    // Dev server starts instantly, so we need to wait a bit more
    let lastError
    for (let i = 0; i < 150; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      try {
        const res = await ofetch<string, 'text'>(ctx.url, {
          ignoreResponseError: true,
          parseResponse: txt => txt,
        })
        if (!res.includes('Reloading server...')) {
          return
        }
      }
      catch (e) {
        lastError = e
      }
    }
    ctx.serverProcess.kill()
    throw lastError || new Error('Timeout waiting for dev server!')
  }
  else {
    ctx.serverProcess = execa('node', [resolve(ctx.nitro.options.output.dir, 'server', 'index.mjs')], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: String(port),
        HOST: host,
        NODE_ENV: 'test',
      },
    })

    await waitForPort(port, { retries: 20, host })
  }
}

/**
 * Stop the running server if any.
 */
export async function stopServer() {
  const ctx = useTestContext()

  if (ctx.serverProcess) {
    ctx.serverProcess.kill()
  }
}
