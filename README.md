# Nitro Test Utils

The main goal for this package is to provide a simple and easy-to-use testing environment for [Nitro](https://nitro.unjs.io) applications, built on top of [Vitest](https://vitest.dev).

## Features

- 🚀 Automatic Nitro server start and stop
- ↪️ Reruns tests whenever Nitro is rebuilt
- ✅ Seamless integration with Vitest
- 🪝 Detect test mode with `import.meta.test`
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

Setting up the Nitro test environment for Vitest is as simple as creating a new `vitest.config.ts` configuration file in your project root.

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({
  /*
   * You may specify configuration options in here.
   *
   * The following options cannot be overridden:
   * - `test.poolOptions.forks.isolate`: always set to `false`
   * - `test.poolOptions.forks.singleFork`: always set to `true`
   *
   * The following options have special behaviors:
   * - `test.forceRerunTriggers`:
   *   - If unspecified, includes `vitest` defaults
   *   - Always include `nitro` output
   * - `test.globalSetup`:
   *   - Always include a script that starts `nitro` server and configures `.env.test`
   */
})
```

> [!TIP]
> Under the hood, the `defineConfig` function will automatically spin up a Nitro server in development mode before running your tests and shut it down afterwards.

Write your tests in a dedicated location, e.g. a `tests` directory. You can use the `$fetch` function to make requests to the Nitro server that is started by the test environment.

A simple example could look like this:

```ts
// `test/routes.test.ts`
import { describe, expect, it } from 'vitest'
import { $fetch } from 'nitro-test-utils/e2e'

describe('routes', () => {
  it('responds successfully', async () => {
    const { data, status } = await $fetch('/api/health')

    expect(status).toBe(200)
    expect(data).toMatchSnapshot()
  })
})
```

> [!NOTE]
> Whenever Nitro is rebuilt, the tests will rerun automatically (unless you have set the `mode` option to `production` in the Vitest configuration).

## Detecting Test Mode

You can detect whether your code is running in test mode by checking the `import.meta.test` property. This is useful if you want to conditionally run code only in test mode, but not in production.

```ts
// `routes/api/my-handler.ts`
export default defineEventHandler(() => ({
  isTest: import.meta.test,
}))
```

### Custom Test Environment Variables

You can set custom environment variables for your tests by creating a `.env.test` file in your Nitro project root. The variables will be loaded automatically when the Nitro server is started.

```ini
# .env.test
FOO=bar
```

## Configuration

### Nitro Root Directory

If your Nitro server is located in a different directory, you can specify the `rootDir` option in the Nitro configuration. It should be the path where the `nitro.config.ts` file lives.

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({
  nitro: {
    // Set the root directory of your Nitro app
    rootDir: 'server',
  },
})
```

By default, the Vitest working directory is used.

### Development vs. Production Build

By default, the Nitro server starts in development mode. This makes development easier, as Nitro will automatically reload when you make changes to your code and the tests will also automatically re-run.

To test the production build of your Nitro server, set the `mode` option in the Vitest configuration:

```ts
import { defineConfig } from 'nitro-test-utils/config'

export default defineConfig({
  nitro: {
    mode: 'production',
  },
})
```

## Test Utilities

### `$fetch`

The `$fetch` function is a simple wrapper around [`ofetch`](https://github.com/unjs/ofetch) and is used to make requests to your Nitro server during testing. Import the function from the `nitro-test-utils/e2e` module. It will dynamically use the base URL of the active test server.

`$fetch` returns a promise that resolves with the raw response from [`ofetch.raw`](https://github.com/unjs/ofetch?tab=readme-ov-file#-access-to-raw-response). This is useful because it allows you to access the response status code, headers, and body, even if the response failed.

**Usage:**

Inside a test definition:

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

## Roadmap

As of right now, the following features are planned:

- [ ] Make environment setup work within Nuxt projects

## License

[MIT](./LICENSE) License © 2024-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
