# Nitro Test Utils

The main goal for this package is to provide a simple and easy-to-use testing environment for [Nitro](https://nitro.unjs.io) applications, built on top of [Vitest](https://vitest.dev). Use it to write tests for API routes and event handlers.

## Features

- 🚀 Automatic Nitro build (development or production mode)
- ↪️ Reruns tests whenever Nitro source files change
- 🥜 Run Nitro per test suite or globally
- ✅ Seamless integration with Vitest
- 🪝 Conditional code execution based on test mode (`import.meta.test`)
- 📡 Familiar [`$fetch`](#fetch) helper like Nuxt test utils

## Installation

Add the `nitro-test-utils` as well as `vitest` to your project with your favorite package manager:

```bash
# pnpm
pnpm add -D nitro-test-utils vitest

# npm
npm install -D nitro-test-utils vitest

# yarn
yarn add -D nitro-test-utils vitest
```

## Basic Usage

There are two ways to set up the Nitro test environment: globally or per test suite. The global setup is useful if you want to test multiple test files against the same Nitro server. The per test suite setup is useful if you want to test different Nitro servers in different test files.

> [!TIP]
> The global setup is recommended for most use cases, as it keeps the Nitro development server running in the background in Vitest watch mode. This allows you to run tests while developing your Nitro application.

### Global Nitro Build

Getting started with the global Nitro test environment for Vitest is as simple as creating a new `vitest.config.ts` configuration file in your project root. Set the `global` option to `true`, which expectes the Nitro source files to be located in the working directory. See the [Configuration](#configuration) section for more options.

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

Write your tests in a dedicated location, e.g. a `tests` directory. You can use the `$fetch` function to make requests to the Nitro server that is started by the test environment.

A simple teste case could look like this:

```ts
import { describe, expect, it } from 'vitest'
import { $fetch } from 'nitro-test-utils/e2e'

describe('api', () => {
  it('responds successfully', async () => {
    const { data, status } = await $fetch('/api/health')

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

Use the `nitro-test-utils/e2e` module to import the `setup` function and the `$fetch` helper. The `setup` function accepts an options object with the `rootDir` property, which should point to the directory where the Nitro server is located. For more options, see the [Configuration](#configuration) section.

```ts
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from 'nitro-test-utils/e2e'

describe('api', () => {
  await setup({
    rootDir: fileURLToPath(new URL('fixture', import.meta.url)),
  })

  it('responds successfully', async () => {
    const { data, status } = await $fetch('/api/health')

    expect(status).toBe(200)
    expect(data).toMatchSnapshot()
  })
})
```

### Detecting Test Environment

You can detect whether your code is running in a Nitro build during tests by checking the `import.meta.test` property. This is useful if you want to conditionally run code only in Nitro tests, but not in production.

```ts
export default defineEventHandler(() => {
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

Depending of your use case, you can configure the Nitro test environment globally or per test suite.

> [!NOTE]
> In each case, you can build Nitro in `development` or `production` mode. If the mode is set to `development`, the preset `nitro-dev` will be used. Otherwise, Nitro will is built with the `node` preset.
> You cannot set the Nitro build preset, since only builds for Node.js are supported in Vitest.

### Global Nitro Configuration

#### Global Nitro Root Directory

If your Nitro server is located in a different directory than the working directory, you can specify the `rootDir` option in the Nitro configuration. It should point to the the same path where the `nitro.config.ts` file is located.

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

If your Nitro server is located in a different directory than the working directory, you can specify the `rootDir` option in the `setup` function. It should point to the the same path where the `nitro.config.ts` file is located.

```ts
// tests/api.test.ts
import { fileURLToPath } from 'node:url'
import { setup } from 'nitro-test-utils/e2e'

describe('api', () => {
  await setup({
    rootDir: fileURLToPath(new URL('fixture', import.meta.url)),
  })
})
```

#### Test Development vs. Production Build

By default, the Nitro server is started in development mode. If you want to test your Nitro server in production mode, you can set the `mode` option in the `setup` function:

```ts
// tests/api.test.ts
import { fileURLToPath } from 'node:url'
import { setup } from 'nitro-test-utils/e2e'

describe('api', () => {
  await setup({
    rootDir: fileURLToPath(new URL('fixture', import.meta.url)),
    mode: 'production'
  })
})
```

## Test Utilities

### `$fetch`

The `$fetch` function is a simple wrapper around [`ofetch`](https://github.com/unjs/ofetch) and is used to make requests to your Nitro server during testing. Import the function from the `nitro-test-utils/e2e` module. It will dynamically use the base URL of the active test server.

`$fetch` returns a promise that resolves with the raw response from [`ofetch.raw`](https://github.com/unjs/ofetch?tab=readme-ov-file#-access-to-raw-response). This is useful because it allows you to access the response status code, headers, and body, even if the response failed.

**Usage:**

Inside a test case:

```ts
// Use `data` instead of `body` for the parsed response body
const { data, status, headers } = await $fetch('/api/hello')

expect(status).toBe(200)
expect(data).toMatchSnapshot()
```

**Type Declaration:**

```ts
function $fetch<T = any, R extends ResponseType = 'json'>(
  path: string,
  options?: FetchOptions<R>
): Promise<FetchResponse<MappedResponseType<R, T>>>
```

> [!TIP]
> Fetch options will be merged with sensible default options, like [`ignoreResponseError`](https://github.com/unjs/ofetch?tab=readme-ov-file#%EF%B8%8F-handling-errors) set to `true` to prevent the function from throwing an error when the response status code is not in the range of 200-299.

## License

[MIT](./LICENSE) License © 2024-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
