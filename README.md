# Nitro Test Utils

A testing toolkit for [Nitro](https://nitro.build) servers, built on top of [Vitest](https://vitest.dev). Use it to test your API routes against the preset you deploy, in development mode or against the production build.

## Features

- 🚀 One Nitro app for all test files, or one per suite
- 📦 Tests the production build of `standard`, `node-server`, or a Cloudflare Workers preset
- ☁️ Runs Cloudflare apps with local KV and D1 bindings; development mode takes the preset from your Nitro config
- 📡 Makes [`serverFetch`](#call-the-app-with-serverfetch) from `nitro` work in tests, plus [`$serverFetch`](#serverfetch) for status, headers, and parsed body
- 🪝 Builds with the `test` env name, so `$test` config blocks and `import.meta.envName` apply
- ↪️ Reruns tests whenever Nitro rebuilds

## Nitro's Built-In Testing or Nitro Test Utils?

Nitro ships its own [Vitest integration](https://nitro.build/docs/testing) through the `nitro()` Vite plugin. It runs your test files inside the Nitro Vite environment in plain Node, so tests can call `useKV()` directly and use `vi.mock`. It ignores the preset's dev runner, though, and never builds for production.

| | Nitro's Vitest integration | Nitro Test Utils |
| --- | --- | --- |
| Project setup | `nitro()` Vite plugin | Any Nitro project, with or without Vite |
| Development mode | Plain Node | The preset's dev runner, e.g. miniflare for `cloudflare-module` |
| Cloudflare bindings | – | ✓ |
| Production build | – | ✓ `standard`, `node-server`, Cloudflare Workers |
| Runtime calls in test files (`useKV()`) | ✓ | Through routes only |
| `vi.mock` for app modules | ✓ | – |
| Env name | `development` | `test` |
| Request API | `serverFetch` | `serverFetch`, `$serverFetch`, `createNitroSession` |

For a Vite project that runs on plain Node, start with Nitro's built-in testing. Reach for Nitro Test Utils when you need platform bindings, a project without Vite, or confidence in the production build.

## Installation

```bash
# pnpm
pnpm add -D nitro-test-utils nitro vitest

# npm
npm install -D nitro-test-utils nitro vitest
```

> [!IMPORTANT]
> Requires Nitro 3.0.261029-rc and Vitest v4 or v5.
>
> Upgrading from an earlier major? See [MIGRATION.md](./MIGRATION.md). Looking for Nitro v2 support? Use [v0.11](https://github.com/johannschopplich/nitro-test-utils/tree/v0) (`nitro-test-utils@^0.11`).

## Quick Start

Create a `vitest.config.ts` in your Nitro project root and enable the global setup:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({}, {
  global: true,
})
```

Vitest now builds the Nitro app once before the first test file and reuses it for all others. Send requests to it with `$serverFetch`:

```ts
import { $serverFetch } from 'nitro-test-utils'
import { expect, it } from 'vitest'

it('responds successfully', async () => {
  const { data, status } = await $serverFetch('/api/health')

  expect(status).toBe(200)
  expect(data).toEqual({ ok: true })
})
```

In watch mode, the app stays up between runs. Whenever Nitro rebuilds, the tests rerun.

Projects that use Nitro as a Vite plugin (`nitro/vite`) need no extra setup: Nitro Test Utils loads `nitro.config.ts` and builds a standalone Nitro app from it. If your `vite.config.ts` enables `resolve.tsconfigPaths`, as `create-nitro-app` does, mirror it in the first argument so `~/...` imports resolve in tests:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig(
  {
    resolve: { tsconfigPaths: true }
  },
  { global: true },
)
```

## Use Cases

### Test the Production Build

Set `mode` to `'production'` to build the app with its preset and test the build output:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({}, {
  global: {
    mode: 'production',
    preset: 'node-server',
  },
})
```

Production mode supports these presets:

- **`standard`** (default) and **`node-server`** load the server entry in-process.
- **`cloudflare-module`** runs the built worker in `wrangler dev`. Since nothing stops `wrangler` when Vitest ends its worker, it works with [`setup()` per test suite](#run-several-nitro-apps) only.

Production mode rejects every other preset, e.g. `node-middleware` or `cloudflare-pages`. In development mode, any preset works, and without one the app runs with the preset from your Nitro config or `NITRO_PRESET`, as in `nitro dev`. Nitro resolves it to its dev counterpart, e.g. `cloudflare-module` to `cloudflare-dev`, and dispatches requests through that preset's dev runner.

Test builds never overwrite your real build output, and `nitro preview` and `wrangler deploy` keep using your last `nitro build`.

### Test Cloudflare Bindings

Set `preset: 'cloudflare-module'` in your Nitro config and add a `wrangler.json` (or `wrangler.toml`) with your bindings to the Nitro project root:

```ts
import { resolve } from 'node:path'
import { $serverFetch, setup } from 'nitro-test-utils'
import { describe, expect, it } from 'vitest'

describe('kv', async () => {
  await setup({
    rootDir: resolve(import.meta.dirname, '..'),
  })

  it('stores a value', async () => {
    const { status } = await $serverFetch('/api/kv', {
      method: 'POST',
      body: { key: 'greeting', value: 'hello' },
    })
    expect(status).toBe(200)
  })
})
```

In development mode, Nitro runs the app in its miniflare runner with local bindings. To run the built worker in `wrangler dev` instead, add `mode: 'production'` and `preset: 'cloudflare-module'`, since production mode defaults to `standard`. This needs `wrangler` installed as a dev dependency.

The worker reads its bindings and vars from the Wrangler config, so `.env.test` doesn't reach `env`. Inside your handlers, access bindings through `env` from `cloudflare:workers`, or through `event.req.runtime.cloudflare.env`:

```ts
import { env } from 'cloudflare:workers'
import { defineHandler } from 'nitro/h3'

export default defineHandler(() => {
  return env.KV.get('my-key')
})
```

### Run Several Nitro Apps

Without the `global` option, no app starts on its own. Call `setup()` at the top of each test suite instead – the app starts before the suite's first test and stops after its last:

```ts
// vitest.config.ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig()
```

```ts
import { resolve } from 'node:path'
import { $serverFetch, setup } from 'nitro-test-utils'
import { describe, expect, it } from 'vitest'

describe('admin api', async () => {
  await setup({
    rootDir: resolve(import.meta.dirname, '../apps/admin'),
    mode: 'production',
  })

  it('responds successfully', async () => {
    const { status } = await $serverFetch('/api/health')
    expect(status).toBe(200)
  })
})
```

Each suite builds its own app, so this fits projects with more than one Nitro app, or suites that need a different mode or preset.

### Override Config for Tests

Nitro Test Utils builds the app with the `test` env name, so a `$test` block in `nitro.config.ts` applies on top of the base config. Use it to swap a storage driver or runtime config without affecting `nitro dev` or `nitro build`:

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

This is [c12's environment-specific config](https://github.com/unjs/c12#environment-specific-configuration), the mechanism behind `$development` and `$production` blocks. The env name stays `test` in production mode, so `$production` blocks don't apply to test builds.

For environment variables, add a `.env.test` file to the Nitro project root. Nitro loads it after `.env` and `.env.local` into the test process before the app starts, in both modes. A variable already set in the shell wins over all three files:

```ini
# .env.test
NITRO_DATABASE_URL=postgres://localhost:5432/test
```

Variables that a Vitest `globalSetup` file sets on `process.env` reach the app as well, e.g. the URL of a database container started for the test run. Like shell variables, they win over the `.env` files.

### Detect the Test Environment

Check `import.meta.envName` for `'test'` to run code only in tests. Nitro types it itself:

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

Nitro's built-in Vitest integration keeps the env name `development`, so this check only holds where Nitro Test Utils runs the app.

### Read Runtime Config in Tests

Nitro runtime primitives like `useRuntimeConfig()` and `useKV()` only hydrate inside the built app. Called from a test file, they return an empty stub. Expose them through a route instead:

```ts
// routes/_test/config.get.dev.ts
import { defineHandler } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

export default defineHandler(() => useRuntimeConfig())
```

```ts
import { $serverFetch } from 'nitro-test-utils'
import { expect, it } from 'vitest'

it('reads the database URL from the env', async () => {
  const { data } = await $serverFetch('/_test/config')
  expect(data.databaseUrl).toBe('postgres://localhost:5432/test')
})
```

The `.dev` suffix keeps the route out of production builds, production test builds included. To keep it in production test builds, drop the suffix and return early unless [`import.meta.envName`](#detect-the-test-environment) is `'test'`.

### Test Login Flows

`createNitroSession` returns an ofetch instance that stores the cookies of each response and sends them with later requests:

```ts
import { createNitroSession } from 'nitro-test-utils'
import { expect, it } from 'vitest'

it('keeps the session cookie', async () => {
  const session = createNitroSession()

  await session.$fetch('/api/login', { method: 'POST' })
  expect(session.cookies.get('session')).toBeDefined()

  const profile = await session.$fetch('/api/profile')
  expect(profile).toEqual({ user: 'authenticated' })

  // Log out
  session.clearCookies()
})
```

### Check Registered Routes

`listRoutes` returns the routes of the running app, e.g. to assert that a handler is registered or to drive one test per endpoint:

```ts
import { listRoutes } from 'nitro-test-utils'
import { expect, it } from 'vitest'

it('registers the auth routes', () => {
  const routes = listRoutes()

  expect(routes).toContainEqual({ route: '/api/login', method: 'post' })
  expect(routes).toContainEqual({ route: '/api/profile', method: 'get' })
})
```

### Call the App With `serverFetch`

While a test app runs, Nitro's own `serverFetch` dispatches to it in both modes and returns a plain `Response`:

```ts
import { serverFetch } from 'nitro'
import { expect, it } from 'vitest'

it('answers with JSON', async () => {
  const response = await serverFetch('/api/health')

  expect(response.headers.get('content-type')).toContain('application/json')
  await expect(response.json()).resolves.toEqual({ ok: true })
})
```

To reach the app over HTTP – from a browser, a shell script, or any other process – put an [srvx](https://github.com/h3js/srvx) server in front of `serverFetch`:

```ts
import { serverFetch } from 'nitro'
import { serve } from 'srvx/node'

const server = serve({
  fetch: request => serverFetch(request),
})
console.log(`Test app listening at ${server.url}`)
```

## API

### `defineConfig`

Creates the Vitest config. The first argument is your Vite/Vitest config, the second the Nitro test options.

```ts
function defineConfig(userConfig?: UserConfig, testConfig?: NitroTestConfig): Promise<UserConfig>
```

`NitroTestConfig`:

- `global` – `true`, or `NitroTestOptions`, to start one app for all test files. Default: off.
- `rerunOnSourceChanges` – Rerun tests when Nitro rebuilds. Default: `true`.

`NitroTestOptions`:

- `rootDir` – The Nitro project root. Default: Vitest's working directory.
- `mode` – `'development'` or `'production'`. Default: `'development'`.
- `preset` – The Nitro preset. Default: the preset from your Nitro config or `NITRO_PRESET` in development, `'standard'` in production.

`defineConfig` sets Vitest's `isolate: false` and `maxWorkers: 1`, so the global app persists across test files.

### `setup`

Starts an app for the current test suite and stops it after the suite. Takes the same `NitroTestOptions`. Throws when a global app is already running.

```ts
function setup(options?: NitroTestOptions): Promise<void>
```

### `$serverFetch`

Sends a request through `serverFetch` with [ofetch](https://github.com/unjs/ofetch), so JSON bodies, query objects, and response parsing work as in ofetch. Resolves with the raw response from [`ofetch.raw`](https://github.com/unjs/ofetch#-access-to-raw-response), with the parsed body as `data`:

```ts
function $serverFetch<T = any, R extends ResponseType = 'json'>(
  request: FetchRequest,
  options?: FetchOptions<R>
): Promise<NitroFetchResponse<MappedResponseType<R, T>>>
```

Pass the expected body type as a generic: `$serverFetch<{ id: string }>('/api/users/42')`. Without one, a JSON body types `data` as `any`. Other `responseType` values map as in ofetch, such as `'text'` to `string`.

These defaults differ from ofetch:

- `ignoreResponseError: true`, so non-2xx responses resolve instead of throwing.
- `retry: 0`, so a flaky route fails the test instead of passing on the second try.
- `headers: { accept: 'application/json' }`, so Nitro answers errors with a JSON body.

Paths resolve against `http://nitro.test`. The `.test` TLD never resolves in DNS, so this URL in an error message points at the test app, not a real host.

### `createNitroSession`

Creates an ofetch instance with a cookie jar. Applies the defaults of `$serverFetch`. `cookies` holds each value as the server encoded it and drops a cookie once the server expires it.

```ts
function createNitroSession(): {
  $fetch: $Fetch
  cookies: Map<string, string>
  clearCookies: () => void
}
```

### `listRoutes`

Returns the scanned and configured routes of the running app, without internal routes under `/_` or `/api/_`. `method` is `undefined` for handlers that match any method.

```ts
function listRoutes(): { route: string, method?: string }[]
```

## How It Works

The global setup builds the app in a Vitest setup file, once per worker. Nitro Test Utils registers the app for `serverFetch` from `nitro`. Development mode dispatches requests through the preset's dev runner. Production mode builds the app, loads `standard` and `node-server` builds in-process through Nitro's `startPreview`, and proxies requests to `wrangler dev` for Cloudflare builds.

Each production build goes to its own directory under `node_modules/.nitro/output/<preset>` inside the Nitro project. Node caches imported modules by path, so a second build into the same directory would serve the first build's code. Nitro's last-build pointer and Wrangler's deploy redirect are restored right after the build, and `wrangler dev` gets the test build's config through `--config`. Production test builds ignore `.env.production` and `.env.preview`.

## License

[MIT](./LICENSE) License © 2024-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
