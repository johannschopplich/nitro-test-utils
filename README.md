# Nitro Test Utils

The main goal for this package is to provide a simple and easy-to-use testing environment for [Nitro](https://nitro.unjs.io) applications, built on top of [Vitest](https://vitest.dev). Use it to write tests for API routes and event handlers.

## Features

- 🚀 Automatic Nitro build (development or production mode)
- ↪️ Reruns tests whenever Nitro source files change
- 🥜 Run Nitro per test suite or globally
- ✅ Seamless integration with Vitest
- 🪝 Conditional code execution based on test mode (`import.meta.test`)
- 📡 Familiar [`$fetchRaw`](#fetchRaw) helper similar to Nuxt test utils

## Installation

Add the `nitro-test-utils` as well as `nitro` and `vitest` to your project with your favorite package manager:

```bash
# pnpm
pnpm add -D nitro-test-utils nitro vitest

# npm
npm install -D nitro-test-utils nitro vitest

# yarn
yarn add -D nitro-test-utils nitro vitest
```

> [!IMPORTANT]
> This package requires Nitro v3 and Vitest v4 or later.
>
> Looking for Nitro v2 support? Use [v0.11](https://github.com/johannschopplich/nitro-test-utils/tree/v0) (`nitro-test-utils@^0.11`).

## Basic Usage

There are two ways to set up the Nitro test environment: globally or per test suite. The global setup is useful if you want to test multiple test files against the same Nitro server. The per test suite setup is useful if you want to test different Nitro servers in different test files.

> [!TIP]
> The global setup is recommended for most use cases where only one Nitro application is being developed. It is more convenient to use than the per-test-suite setup because it keeps the Nitro development server running in the background during Vitest watch mode.
> This allows you to develop your Nitro application and write tests at the same time.

### Global Nitro Build

Getting started with the global Nitro test environment for Vitest is as simple as creating a new `vitest.config.ts` configuration file in your project root. Set the `global` option to `true`, which expects the Nitro source files to be located in the working directory. See the [Configuration](#configuration) section for more options.

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({
  nitro: {
    global: true
  }
})
```

> [!TIP]
> Under the hood, Vitest will automatically spin up a Nitro server before running your tests and shut it down afterwards.

Write your tests in a dedicated location, e.g. a `tests` directory. You can use the `$fetchRaw` function to make requests to the Nitro server that is started by the test environment.

A simple test case could look like this:

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

> [!NOTE]
> Whenever Nitro is rebuilt, the tests will rerun automatically (unless you have set the `mode` option to `production` in the Vitest configuration).

### Per Test Suite Nitro Build

For multiple Nitro servers as part of your project, you can set up the Nitro test environment per test suite. Configure Vitest by creating a new `vitest.config.ts` configuration file in your project root:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig()
```

Contrary to the global setup, the Nitro server is not started automatically by Vitest. Instead, you need to call the `setup` function in each test suite to start the Nitro server. After each test suite, the Nitro server is shut down.

Use the `nitro-test-utils/e2e` module to import the `setup` function and the `$fetchRaw` helper. The `setup` function accepts an options object with the `rootDir` property, which should point to the directory where the Nitro server is located. For more options, see the [Configuration](#configuration) section.

```ts
import { resolve } from 'node:path'
import { $fetchRaw, setup } from 'nitro-test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('api', async () => {
  await setup({
    rootDir: resolve(import.meta.dirname, 'fixture'),
  })

  it('responds successfully', async () => {
    const { data, status } = await $fetchRaw('/api/health')

    expect(status).toBe(200)
    expect(data).toMatchSnapshot()
  })
})
```

### Detecting Test Environment

You can detect whether your code is running in a Nitro build during tests by checking the `import.meta.test` property. This is useful if you want to conditionally run code only in Nitro tests, but not in production.

```ts
import { defineHandler } from 'nitro'

export default defineHandler(async () => {
  // Mock data for tests
  if (import.meta.test) {
    return { foo: 'bar' }
  }

  // Your production code here
  const db = await connectToDatabase()
  return db.query()
})
```

### Custom Test Environment Variables

You can set custom environment variables for your tests by creating a `.env.test` file in your Nitro project root. The variables will be loaded automatically when the Nitro server is started.

```ini
# .env.test
FOO=bar
```

## Configuration

Depending on your use case, you can configure the Nitro test environment globally or per test suite.

> [!NOTE]
> In each case, you can build Nitro in `development` or `production` mode. If the mode is set to `development`, the preset `nitro-dev` will be used. Otherwise, Nitro will be built with the `node-middleware` preset.
> You cannot set the Nitro build preset, since only builds for Node.js are supported in Vitest.

### Global Nitro Configuration

#### Global Nitro Root Directory

If your Nitro server is located in a different directory than the working directory, you can specify the `rootDir` option in the Nitro configuration. It should point to the same path where the `nitro.config.ts` file is located.

```ts
// vitest.config.ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({
  nitro: {
    global: {
      // Set the root directory of your Nitro server
      rootDir: 'backend'
    }
  },
})
```

By default, the Vitest working directory is used.

#### Global Development vs. Production Build

By default, the Nitro server starts in development mode. This makes development easier, as Nitro will automatically reload when you make changes to your code and the tests will also automatically re-run.

To test the production build of your Nitro server, set the `mode` option in the Vitest configuration:

```ts
// vitest.config.ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({
  nitro: {
    global: {
      mode: 'production'
    },
  },
})
```

### Per Test Suite Nitro Configuration

#### Test Nitro Root Directory

If your Nitro server is located in a different directory than the working directory, you can specify the `rootDir` option in the `setup` function. It should point to the same path where the `nitro.config.ts` file is located.

```ts
// tests/api.test.ts
import { resolve } from 'node:path'
import { setup } from 'nitro-test-utils/e2e'

describe('api', async () => {
  await setup({
    rootDir: resolve(import.meta.dirname, 'fixture'),
  })
})
```

#### Test Development vs. Production Build

By default, the Nitro server is started in development mode. If you want to test your Nitro server in production mode, you can set the `mode` option in the `setup` function:

```ts
// tests/api.test.ts
import { resolve } from 'node:path'
import { setup } from 'nitro-test-utils/e2e'

describe('api', async () => {
  await setup({
    rootDir: resolve(import.meta.dirname, 'fixture'),
    mode: 'production'
  })
})
```

## Migrating from Nitro v2

If you are upgrading from an earlier version of `nitro-test-utils` that targeted Nitro v2 (`nitropack`), the following breaking changes apply:

- **Peer dependency**: `nitropack` has been replaced by `nitro` (v3).
- **Renamed types**: `TestOptions` → `NitroTestOptions`, `TestContext` → `NitroTestContext`, `TestServer` → `NitroTestServer`, `TestFetchResponse` → `NitroFetchResponse`.
- **Removed deprecated config fields**: The top-level `mode` and `rootDir` options in the Vitest `nitro` config have been removed. Use `nitro.global.mode` and `nitro.global.rootDir` instead.

For Nitro v3 API changes (handler definitions, error handling, request body, presets, etc.), see the [official Nitro v3 migration guide](https://nitro.build/guide/migration).

## Test Utilities

### `injectServerUrl`

To get the URL of the active test server for the current test suite or global test environment, you can use the `injectServerUrl` function.

**Usage:**

```ts
import { injectServerUrl } from 'nitro-test-utils/e2e'

describe('api', () => {
  it('should log the Nitro server URL', async () => {
    const serverUrl = injectServerUrl()
    console.log(serverUrl) // http://localhost:3000
  })
})
```

**Type Declaration:**

```ts
function injectServerUrl(): string
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

**Usage:**

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

You can pass `ofetch` interceptors (`onRequest`, `onResponse`, `onRequestError`, `onResponseError`) to customize request/response handling while keeping the default base URL and options.

### `$fetchRaw`

The `$fetchRaw` function is a simple wrapper around the custom [`ofetch`](https://github.com/unjs/ofetch) `$Fetch` instance created by `createNitroFetch`. It simplifies requesting data from your Nitro server during testing. Import the function from the `nitro-test-utils/e2e` module. It will dynamically use the base URL of the active test server.

`$fetchRaw` returns a promise that resolves with the raw response from [`ofetch.raw`](https://github.com/unjs/ofetch?tab=readme-ov-file#-access-to-raw-response). This is useful because it allows you to access the response status code, headers, and body, even if the response failed.

**Usage:**

Inside a test case:

```ts
// Use `data` instead of `body` for the parsed response body
const { data, status, headers } = await $fetchRaw('/api/hello')

expect(status).toBe(200)
expect(data).toMatchSnapshot()
```

**Type Declaration:**

```ts
interface NitroFetchResponse<T> extends FetchResponse<T> {
  /** Alias for `response._data` */
  data?: T
}

function $fetchRaw<T = any, R extends ResponseType = 'json'>(
  path: string,
  options?: FetchOptions<R>
): Promise<NitroFetchResponse<MappedResponseType<R, T>>>
```

> [!TIP]
> All additional options set in [`createNitroFetch`](#createnitrofetch) apply here as well, such as [`ignoreResponseError`](https://github.com/unjs/ofetch?tab=readme-ov-file#%EF%B8%8F-handling-errors) set to `true` to prevent the function from throwing an error when the response status code is not in the range of 200-299, and `retry: 0` to disable retries.

### `createNitroSession`

Creates a session-aware fetch instance that persists cookies across requests. Useful for testing authentication flows.

**Usage:**

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

## License

[MIT](./LICENSE) License © 2024-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
