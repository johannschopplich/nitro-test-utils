# Nitro Test Utils

A simple and easy-to-use testing toolkit for [Nitro](https://nitro.build) servers, built on top of [Vitest](https://vitest.dev). Use it to write tests for your API routes and event handlers.

## Features

- 🚀 Automatic Nitro build (development or production mode)
- ↪️ Reruns tests whenever Nitro source files change
- 🥜 Run Nitro per test suite or globally
- ✅ Seamless integration with Vitest
- 🪝 Conditional code execution based on test mode (`import.meta.test`)
- ☁️ Cloudflare Workers support with local bindings emulation (KV, D1, R2, …)
- 📡 Typed [`$fetchRaw`](#fetchraw) helper with route-level responses inherited from Nitro's `InternalApi`
- 🗺️ Introspect registered routes with [`listRoutes`](#listroutes)

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
> Requires Nitro v3 and Vitest v4 or later.
>
> Looking for Nitro v2 support? Use [v0.11](https://github.com/johannschopplich/nitro-test-utils/tree/v0) (`nitro-test-utils@^0.11`).

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

Now, write your tests in a dedicated directory. You can use the `$fetchRaw` function to make requests to the Nitro server that is started by the test environment. A simple test case could look like this:

```ts
import { $fetchRaw } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('api', () => {
  it('responds successfully', async () => {
    const { data, status } = await $fetchRaw('/api/health')

    expect(status).toBe(200)
    expect(data).toMatchSnapshot()
  })
})
```

> [!TIP]
> The global setup is recommended for most use cases. It keeps the Nitro dev server running in the background during Vitest watch mode, so you can develop and test at the same time. Whenever Nitro rebuilds, tests rerun automatically.

### Per-Suite Setup

If you have multiple Nitro servers as part of your project, you can set up the test environment per test suite instead. The Vitest config needs no nitro options:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig()
```

Contrary to the global setup, the Nitro server is not started automatically. Instead, call the `setup` function in each test suite to start a Nitro server. After each test suite, the server is shut down:

```ts
import { resolve } from 'node:path'
import { $fetchRaw, setup } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('api', async () => {
  await setup({
    rootDir: resolve(import.meta.dirname, 'fixture'),
    mode: 'production',
  })

  it('responds successfully', async () => {
    const { data, status } = await $fetchRaw('/api/health')

    expect(status).toBe(200)
    expect(data).toMatchSnapshot()
  })
})
```

## Configuration

### Environment Variables

You can set custom environment variables for your tests by creating a `.env.test` file in your Nitro project root. The variables will be loaded automatically when the Nitro server starts:

```ini
# .env.test
FOO=bar
```

### Deployment Presets

By default, `nitro-test-utils` uses Node.js-compatible presets (`nitro-dev` for development, `node-middleware` for production). If your application targets a different deployment platform, you can set the `preset` option to match your deployment target.

> [!NOTE]
> Non-Node presets like `cloudflare-module` only work in development mode, since Vitest runs inside a Node.js process.

#### Cloudflare Workers

To test Cloudflare-specific features like KV, D1, or R2 bindings locally, set the preset to `cloudflare-module`. Nitro automatically resolves this to the `cloudflare-dev` preset in development mode, which emulates Cloudflare bindings locally via wrangler's `getPlatformProxy()`.

Make sure `wrangler` is installed as a dev dependency and a `wrangler.json` (or `wrangler.toml`) with your bindings configuration exists in your Nitro project root.

```ts
await setup({
  rootDir: resolve(import.meta.dirname, 'fixture'),
  preset: 'cloudflare-module',
})
```

Inside your Nitro handlers, access Cloudflare bindings through `event.req.runtime.cloudflare.env`:

```ts
import { defineHandler } from 'nitro/h3'

export default defineHandler((event) => {
  const { env } = (event.req as any).runtime.cloudflare
  return env.KV.get('my-key')
})
```

### Detecting Test Environment

You can detect whether your code is running in a Nitro build during tests by checking the `import.meta.test` property. This is useful if you want to conditionally run code only in tests, but not in production:

```ts
import { defineHandler } from 'nitro/h3'

export default defineHandler(async () => {
  if (import.meta.test) {
    return { foo: 'bar' }
  }

  const db = await connectToDatabase()
  return db.query()
})
```

To get proper TypeScript support for `import.meta.test`, add a triple-slash reference in your `env.d.ts` (or any `.d.ts` file included by your `tsconfig.json`):

```ts
/// <reference types="nitro-test-utils/env" />
```

## API Reference

### `defineConfig`

Configures Vitest for Nitro testing. Accepts an optional Vite/Vitest config as the first argument and Nitro test options as the second.

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig(
  // Vite/Vitest config (optional)
  { test: { dir: './tests' } },
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
  /** Nitro deployment preset. */
  preset?: string
}
```

### `setup`

Starts a Nitro server for the current test suite. Used with the per-suite setup. The server is automatically stopped after the suite completes.

```ts
import { setup } from 'nitro-test-utils/e2e'

await setup({ rootDir: './fixture' })
```

**Type Declaration:**

```ts
function setup(options?: NitroTestOptions): Promise<void>
```

See [`NitroTestOptions`](#defineconfig) for available options.

### `$fetchRaw`

A simple wrapper around the custom [`ofetch`](https://github.com/unjs/ofetch) instance created by `createNitroFetch`. It simplifies requesting data from your Nitro server during testing and will dynamically use the base URL of the active test server.

`$fetchRaw` returns a promise that resolves with the raw response from [`ofetch.raw`](https://github.com/unjs/ofetch?tab=readme-ov-file#-access-to-raw-response). This is useful because it allows you to access the response status code, headers, and body, even if the response failed.

```ts
import { $fetchRaw } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('api', () => {
  it('responds with data', async () => {
    // Use `data` instead of `body` for the parsed response body
    const { data, status, headers } = await $fetchRaw('/api/hello')

    expect(status).toBe(200)
    expect(data).toMatchSnapshot()
  })
})
```

> [!TIP]
> All additional options set in [`createNitroFetch`](#createnitrofetch) apply here as well, such as [`ignoreResponseError`](https://github.com/unjs/ofetch?tab=readme-ov-file#%EF%B8%8F-handling-errors) set to `true` to prevent the function from throwing an error when the response status code is not in the range of 200-299, and `retry: 0` to disable retries.

> [!NOTE]
> The name `$fetchRaw` is deliberate – it avoids shadowing ofetch's `$fetch` with different defaults and return shape. See [#10](https://github.com/johannschopplich/nitro-test-utils/issues/10) for the rationale.

#### Route-Level Response Types

`$fetchRaw` inherits route-level typing from Nitro's `InternalApi` augmentation. Nitro regenerates these types at `node_modules/.nitro/types/nitro-routes.d.ts` on every build – when your `tsconfig.json` extends `nitro/tsconfig`, response data narrows automatically to the matching handler's return type:

```ts
// api/users/[id].get.ts returns `{ id: string, name: string }`
const { data } = await $fetchRaw('/api/users/42')
// `data` is typed as `{ id: string, name: string } | undefined`
```

Unknown routes and explicit generic overrides both fall back gracefully:

```ts
// Falls back to `unknown` for routes not present in `InternalApi`
const { data } = await $fetchRaw('/api/not-declared')

// Explicit override when you want to pin the response shape yourself
const { data } = await $fetchRaw<{ custom: string }>('/api/health')
```

**Type Declaration:**

```ts
interface NitroFetchResponse<T> extends FetchResponse<T> {
  /** Alias for `response._data` */
  data?: T
}

function $fetchRaw(
  request: string,
  options?: FetchOptions
): Promise<NitroFetchResponse<unknown>>
```

### `createNitroFetch`

Creates a custom [`ofetch`](https://github.com/unjs/ofetch) instance with the Nitro server URL as the base URL.

> [!TIP]
> The following additional fetch options have been set as defaults:
>
> - `ignoreResponseError: true` to prevent throwing errors on non-2xx responses.
> - `redirect: 'manual'` to prevent automatic redirects.
> - `retry: 0` to disable retries, preventing masked failures and slow test suites.
> - `headers: { accept: 'application/json' }` to force a JSON error response when Nitro returns an error.

Use `createNitroFetch` to get a `$fetch` instance pre-configured for your Nitro test server – no extra setup needed:

```ts
import { createNitroFetch } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('api', () => {
  const $fetch = createNitroFetch()

  it('responds with data', async () => {
    const data = await $fetch('/api/health')
    expect(data).toEqual({ ok: true })
  })
})
```

**Type Declaration:**

```ts
function createNitroFetch(options?: FetchHooks): $Fetch
```

You can pass `ofetch` interceptors (`onRequest`, `onResponse`, `onRequestError`, `onResponseError`) to customize request/response handling.

### `createNitroSession`

Creates a session-aware fetch instance that persists cookies across requests. Useful for testing authentication flows.

```ts
import { createNitroSession } from 'nitro-test-utils/e2e'
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

### `injectServerUrl`

To get the URL of the active test server for the current test suite or global test environment, you can use the `injectServerUrl` function.

```ts
import { injectServerUrl } from 'nitro-test-utils/e2e'
import { describe, it } from 'vitest'

describe('api', () => {
  it('logs Nitro server URL', () => {
    const serverUrl = injectServerUrl()
    console.log(serverUrl) // http://localhost:3000
  })
})
```

**Type Declaration:**

```ts
function injectServerUrl(): string
```

### `listRoutes`

Returns every route registered with the active Nitro test server, sourced from Nitro's scanned handlers. Internal routes prefixed with `/_` or `/api/_` are filtered out.

Useful for sanity-checking that expected handlers are loaded, or for driving parameterized tests over every API endpoint. Works in both per-suite and global setup modes, and is safe to call any time after `setup()` has resolved.

```ts
import { listRoutes } from 'nitro-test-utils/e2e'
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

## Migration

### From v2 to v3

`$fetchRaw` now inherits route-level typing from Nitro's `InternalApi` augmentation. Its first generic default changed from `T = any` to `T = unknown`, so call sites that dereference `data` without narrowing will fail to type-check.

The preferred fix is to set up Nitro's type augmentation so `$fetchRaw` picks up handler return types automatically – see [Route-Level Response Types](#route-level-response-types). Where that isn't practical, pass an explicit generic:

```diff
-const { data } = await $fetchRaw('/api/users')
-expect(data.id).toBe(1)
+const { data } = await $fetchRaw<{ id: number }>('/api/users')
+expect(data?.id).toBe(1)
```

> [!NOTE]
> The second generic on `$fetchRaw` previously accepted ofetch's `ResponseType` (`'json'`, `'text'`, …). It now represents the request route. This only affects code that passed an explicit second generic – a rarely-used call shape.

### From v1 to v2

The `nitro` key on Vite's `UserConfig` has been replaced with a second argument to `defineConfig`. This resolves a type collision with Nitro's own Vite plugin (`nitro/vite`), which claims the same `nitro` key.

```diff
 import { defineConfig } from 'nitro-test-utils/config'

-export default defineConfig({
-  nitro: {
-    global: true,
-  },
-})
+export default defineConfig({}, {
+  global: true,
+})
```

With custom options:

```diff
-export default defineConfig({
-  nitro: {
-    global: {
-      rootDir: 'backend',
-      mode: 'production',
-    },
-    rerunOnSourceChanges: false,
-  },
-})
+export default defineConfig({}, {
+  global: {
+    rootDir: 'backend',
+    mode: 'production',
+  },
+  rerunOnSourceChanges: false,
+})
```

### From v0.x (Nitro v2)

If you are upgrading from an earlier version of `nitro-test-utils` that targeted Nitro v2 (`nitropack`), the following breaking changes apply:

- **Peer dependency**: `nitropack` replaced by `nitro` (v3).
- **Renamed types**: `TestOptions` → `NitroTestOptions`, `TestContext` → `NitroTestContext`, `TestServer` → `NitroTestServer`, `TestFetchResponse` → `NitroFetchResponse`.

For Nitro v3 API changes, see the [official Nitro v3 migration guide](https://nitro.build/guide/migration).

## License

[MIT](./LICENSE) License (c) 2024-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
