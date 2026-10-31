# Nitro Test Utils

A testing toolkit for [Nitro](https://nitro.build) servers, built on top of [Vitest](https://vitest.dev). Use it to test your API routes against the preset you deploy, in development mode or against the production build.

## Features

- 🚀 Automatic Nitro build (development or production mode)
- ☁️ Cloudflare Workers support with local bindings (KV, D1, R2, …) through Nitro's miniflare runner
- 📦 Production-build testing with `standard`, `node-server`, or a Cloudflare preset
- 📡 [`serverFetch`](#serverfetch) from `nitro` works in your tests, plus [`$serverFetch`](#serverfetch-1) for status, headers, and parsed body, even for error responses
- ↪️ Reruns tests whenever Nitro source files change
- 🥜 Run Nitro per test suite or globally
- 🪝 Builds with the `test` env name, so `$test` config blocks and `import.meta.envName` apply
- 🗺️ Introspect registered routes with [`listRoutes`](#listroutes)

## Nitro's Built-In Testing or Nitro Test Utils?

Nitro ships its own [Vitest integration](https://nitro.build/docs/testing) through the `nitro()` Vite plugin. It runs your test files inside the Nitro Vite environment in plain Node, so tests can call `useKV()` directly and use `vi.mock`. It ignores the preset's dev runner, though, and never builds for production.

Nitro Test Utils covers what the built-in integration leaves out:

| | Nitro's Vitest integration | Nitro Test Utils |
| --- | --- | --- |
| Project setup | `nitro()` Vite plugin | Any Nitro project, with or without Vite |
| Development mode | Plain Node | The preset's dev runner, e.g. miniflare for `cloudflare-module` |
| Cloudflare bindings | – | ✓ |
| Production build | – | ✓ `standard`, `node-server`, Cloudflare |
| Runtime calls in test files (`useKV()`) | ✓ | Through routes only |
| `vi.mock` for app modules | ✓ | – |
| Env name | `development` | `test` |
| Request API | `serverFetch` | `serverFetch`, `$serverFetch`, `createNitroSession` |

For a Vite project that runs on plain Node, start with Nitro's built-in testing. Reach for Nitro Test Utils when you need platform bindings, a project without Vite, or confidence in the production build.

## Installation

Add `nitro-test-utils` as well as `nitro` and `vitest` to your project with your favorite package manager:

```bash
# pnpm
pnpm add -D nitro-test-utils nitro vitest

# npm
npm install -D nitro-test-utils nitro vitest

# yarn
yarn add -D nitro-test-utils nitro vitest
```

> [!IMPORTANT]
> Requires Nitro 3.0.261029-rc and Vitest v4 or v5.
>
> Upgrading from an earlier major? See [MIGRATION.md](./MIGRATION.md). Looking for Nitro v2 support? Use [v0.11](https://github.com/johannschopplich/nitro-test-utils/tree/v0) (`nitro-test-utils@^0.11`).

## Setup

There are two ways to set up the test environment: **globally** (one Nitro server for all tests) or **per test suite** (different servers per test file).

> [!NOTE]
> If you are using **Nitro as a Vite plugin** (`nitro/vite`), no additional configuration is needed. Since `nitro.config.ts` is required even in Vite projects, `nitro-test-utils` loads it directly and creates a standalone Nitro server for testing.

### Global Setup (Recommended)

Getting started with the global setup is as simple as creating a `vitest.config.ts` in your project root. Pass `{ global: true }` as the second argument to enable a shared Nitro server for all tests:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({}, {
  global: true,
})
```

You can also pass an options object to `global` with additional options like `rootDir`, `mode`, and `preset`:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({}, {
  global: {
    rootDir: 'backend',
    mode: 'production',
  },
})
```

Now, write your tests in a dedicated directory. Use `$serverFetch` to send requests to the Nitro app that the test environment starts:

```ts
import { $serverFetch } from 'nitro-test-utils'
import { describe, expect, it } from 'vitest'

describe('api', () => {
  it('responds successfully', async () => {
    const { data, status } = await $serverFetch('/api/health')

    expect(status).toBe(200)
    expect(data).toMatchSnapshot()
  })
})
```

> [!TIP]
> The global setup is recommended for most use cases. The Nitro app is built once and reused across every test file during Vitest watch mode, so you can develop and test at the same time. Whenever Nitro rebuilds, tests rerun automatically.

### Per-Suite Setup

If you have multiple Nitro servers as part of your project, you can set up the test environment per test suite instead. The Vitest config needs no Nitro options:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig()
```

Contrary to the global setup, the Nitro server is not started automatically. Instead, call the `setup` function in each test suite to start a Nitro server. After each test suite, the server is shut down:

```ts
import { resolve } from 'node:path'
import { $serverFetch, setup } from 'nitro-test-utils'
import { describe, expect, it } from 'vitest'

describe('api', async () => {
  await setup({
    rootDir: resolve(import.meta.dirname, 'fixture'),
    mode: 'production',
  })

  it('responds successfully', async () => {
    const { data, status } = await $serverFetch('/api/health')

    expect(status).toBe(200)
    expect(data).toMatchSnapshot()
  })
})
```

## Configuration

### Path Aliases

If you scaffolded your project with `create-nitro-app`, the generated `vite.config.ts` enables `resolve.tsconfigPaths`. The test config doesn't share it – mirror the option in `defineConfig`'s first argument so `~/...` imports resolve in tests:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig(
  {
    resolve: { tsconfigPaths: true }
  },
  { global: true, }
)
```

### Environment Variables

You can set custom environment variables for your tests by creating a `.env.test` file in your Nitro project root. The variables are loaded into the test process when the Nitro server starts, in both modes. Production builds with `standard` or `node-server` ignore `.env.production` and `.env.preview`:

```ini
# .env.test
FOO=bar
```

### Test-Specific Nitro Config

The Nitro test server builds with the `test` env name. You can override Nitro options for tests by adding a `$test` block to your `nitro.config.ts`. Its contents are merged on top of the base config – useful for swapping a storage driver or runtime config without affecting `nitro dev` or `nitro build`:

```ts
// nitro.config.ts
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  storage: {
    db: { driver: 'fs', base: './data' },
  },
  $test: {
    storage: {
      db: { driver: 'memory' },
    },
  },
})
```

This uses [C12's environment-specific configuration](https://github.com/unjs/c12#environment-specific-configuration), the same mechanism Nitro applies for `$development` and `$production` blocks. Since the env name is `test` in production mode too, `$production` blocks don't apply to production test builds.

### Deployment Presets

Set the `preset` option to the platform you deploy to. Without it, development mode uses `nitro-dev` and production mode uses `standard`.

- **Development mode:** Nitro resolves deployment presets to their dev counterpart, e.g. `cloudflare-module` to `cloudflare-dev`, and dispatches requests through that preset's dev runner.
- **Production mode:** The app is built with the preset and served by Nitro's preview. `standard` and `node-server` load in-process. Cloudflare presets spawn `wrangler` and proxy to it. Production mode rejects every other preset, e.g. `node-middleware`.

Each production build goes to its own directory under `node_modules/.nitro/output/<preset>` inside the Nitro project, so it never overwrites the output of a real `nitro build`. Nitro's last-build pointer and Wrangler's deploy redirect are restored, so `nitro preview` and `wrangler deploy` keep using your real build.

#### Cloudflare Workers

To test Cloudflare-specific features like KV, D1, or R2 bindings locally, set the preset to `cloudflare-module`. In development mode, Nitro runs the app in its miniflare runner with local bindings. In production mode, the built worker runs in `wrangler dev`, so call `setup()` per test suite: global production mode rejects Cloudflare presets, since nothing would stop `wrangler` when Vitest ends its worker.

Install `wrangler` as a dev dependency – otherwise Nitro's preview fetches it through `npx` – and add a `wrangler.json` (or `wrangler.toml`) with your bindings configuration to your Nitro project root. The worker reads its bindings and vars from that config, so `.env.test` doesn't reach `env`.

```ts
await setup({
  rootDir: resolve(import.meta.dirname, 'fixture'),
  preset: 'cloudflare-module',
})
```

Inside your Nitro handlers, access Cloudflare bindings through `env` from `cloudflare:workers`, or through `event.req.runtime.cloudflare.env`:

```ts
import { env } from 'cloudflare:workers'
import { defineHandler } from 'nitro/h3'

export default defineHandler(() => {
  return env.KV.get('my-key')
})
```

### Detecting the Test Environment

Nitro exposes the env name as `import.meta.envName`, typed by Nitro itself. Check it for `'test'` to run code only in tests:

```ts
import { defineHandler } from 'nitro/h3'

export default defineHandler(async () => {
  if (import.meta.envName === 'test') {
    return { foo: 'bar' }
  }

  const db = await connectToDatabase()
  return db.query()
})
```

> [!NOTE]
> Nitro's built-in Vitest integration keeps the env name `development`, so this check only holds where Nitro Test Utils runs the app.

### Testing Runtime Primitives

Nitro runtime primitives like `useRuntimeConfig()` and `useKV()` only hydrate inside the built server bundle. Calling them directly from a test file returns an empty stub.

Expose them through a dev-only route and read the values via [`$serverFetch`](#serverfetch-1). Nitro's `.dev` env suffix keeps the handler out of production builds at routing init:

```ts
// routes/_test/config.get.dev.ts
import { defineHandler } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

export default defineHandler(() => useRuntimeConfig())
```

```ts
import { $serverFetch } from 'nitro-test-utils'
import { expect, it } from 'vitest'

it('exposes runtime config', async () => {
  const { data } = await $serverFetch('/_test/config')
  expect(data.databaseUrl).toBe('postgres://localhost:5432/app')
})
```

> [!NOTE]
> Production-mode test runs (`setup({ mode: 'production' })`) also filter out `.dev` handlers. Gate the route on [`import.meta.envName`](#detecting-the-test-environment) instead if you need it in both modes.

## API Reference

### `defineConfig`

Configures Vitest for Nitro testing. Accepts an optional Vite/Vitest config as the first argument and Nitro test options as the second.

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig(
  // Vite/Vitest config (optional)
  {
    test: { dir: './tests' }
  },
  // Nitro test options (optional)
  { global: true }
)
```

**Type Declaration:**

```ts
function defineConfig(
  userConfig?: UserConfig,
  testConfig?: NitroTestConfig
): Promise<UserConfig>

interface NitroTestConfig {
  /** Watch Nitro source files and rerun tests on changes. Default: `true`. */
  rerunOnSourceChanges?: boolean
  /** Enable a global Nitro server for all tests. Set to `true` for defaults, or pass options. */
  global?: boolean | NitroTestOptions
}

interface NitroTestOptions {
  /** Path to the Nitro project root. Default: Vitest working directory. */
  rootDir?: string
  /** `'development'` (default) or `'production'`. */
  mode?: 'development' | 'production'
  /** Nitro deployment preset. Default: `'nitro-dev'` in development, `'standard'` in production. */
  preset?: string
}
```

### `setup`

Starts a Nitro server for the current test suite. Used with the per-suite setup. The server is automatically stopped after the suite completes.

```ts
import { setup } from 'nitro-test-utils'

await setup({ rootDir: './fixture' })
```

**Type Declaration:**

```ts
function setup(options?: NitroTestOptions): Promise<void>
```

See [`NitroTestOptions`](#defineconfig) for available options.

### `serverFetch`

Nitro's own request primitive, imported from `nitro`. While a Nitro test server runs, `serverFetch` dispatches to it in both modes and returns a plain `Response`:

```ts
import { serverFetch } from 'nitro'
import { expect, it } from 'vitest'

it('dispatches a request', async () => {
  const response = await serverFetch('/api/health')

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({ ok: true })
})
```

If you need a real HTTP server on top of the test app – for driving a browser, a shell script, or any other process that speaks TCP – stand one up with [srvx](https://github.com/h3js/srvx) and point it at `serverFetch`:

```ts
import { serverFetch } from 'nitro'
import { serve } from 'srvx/node'

const server = serve({
  fetch: request => serverFetch(request),
})
console.log(`Test app listening at ${server.url}`)
```

### `$serverFetch`

Sends a request through `serverFetch` with [`ofetch`](https://github.com/unjs/ofetch) on top, so JSON bodies, query objects, and response parsing work as in ofetch. It resolves with the raw response from [`ofetch.raw`](https://github.com/unjs/ofetch?tab=readme-ov-file#-access-to-raw-response), with the parsed body as `data`:

```ts
import { $serverFetch } from 'nitro-test-utils'
import { describe, expect, it } from 'vitest'

describe('api', () => {
  it('creates a user', async () => {
    const { data, status, headers } = await $serverFetch('/api/users', {
      method: 'POST',
      body: { name: 'Ada' },
    })

    expect(status).toBe(201)
    expect(data).toMatchSnapshot()
  })
})
```

> [!TIP]
> The following fetch options differ from ofetch's defaults:
>
> - `ignoreResponseError: true` to prevent throwing errors on non-2xx responses.
> - `retry: 0` to disable retries, preventing masked failures and slow test suites.
> - `headers: { accept: 'application/json' }` to force a JSON error response when Nitro returns an error.

> [!NOTE]
> Requests use `http://nitro.test` as a synthetic base URL. The `.test` TLD is reserved and never resolves in DNS, so if you see it in an error message or stack trace it's the synthetic base URL, not a real endpoint.

#### Response Types

Pass the expected response shape as a generic. Without one, a JSON body types `data` as `any`; other `responseType` values map as in ofetch, such as `'text'` to `string`:

```ts
const { data } = await $serverFetch<{ id: string, name: string }>('/api/users/42')
```

**Type Declaration:**

```ts
interface NitroFetchResponse<T> extends FetchResponse<T> {
  /** Alias for `response._data`. */
  data?: T
}

function $serverFetch<T = any, R extends ResponseType = 'json'>(
  request: FetchRequest,
  options?: FetchOptions<R>
): Promise<NitroFetchResponse<MappedResponseType<R, T>>>
```

### `createNitroSession`

Creates a session-aware fetch instance that persists cookies across requests. Useful for testing authentication flows. It applies the same fetch defaults as [`$serverFetch`](#serverfetch-1).

```ts
import { createNitroSession } from 'nitro-test-utils'
import { describe, expect, it } from 'vitest'

describe('auth', () => {
  it('persists session cookies', async () => {
    const session = createNitroSession()

    // Login sets a session cookie
    await session.$fetch('/api/login', { method: 'POST' })

    // Subsequent requests include the cookie automatically
    const profile = await session.$fetch('/api/profile')
    expect(profile).toEqual({ user: 'authenticated' })

    // Inspect cookies directly
    expect(session.cookies.get('session')).toBeDefined()

    // Clear cookies to simulate logout
    session.clearCookies()
  })
})
```

**Type Declaration:**

```ts
interface NitroSession {
  $fetch: $Fetch
  cookies: Map<string, string>
  clearCookies: () => void
}

function createNitroSession(): NitroSession
```

### `listRoutes`

Returns every route registered with the active Nitro test server, sourced from Nitro's scanned handlers. Internal routes prefixed with `/_` or `/api/_` are filtered out.

Useful for sanity-checking that expected handlers are loaded, or for driving parameterized tests over every API endpoint. Works in both per-suite and global setup modes, and is safe to call any time after `setup()` has resolved.

```ts
import { listRoutes } from 'nitro-test-utils'
import { describe, expect, it } from 'vitest'

describe('api', () => {
  it('registers the expected routes', () => {
    const routes = listRoutes()

    expect(routes).toContainEqual({ route: '/api/health', method: 'get' })
    expect(routes).toContainEqual({ route: '/api/login', method: 'post' })
  })
})
```

**Type Declaration:**

```ts
interface NitroRouteInfo {
  /** HTTP pathname pattern (e.g. `/api/users`, `/api/users/:id`). */
  route: string
  /** HTTP method, or `undefined` when the handler matches any method. */
  method?: string
}

function listRoutes(): NitroRouteInfo[]
```

## License

[MIT](./LICENSE) License © 2024-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
