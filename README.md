# Nitro Test Utils

The main goal for this package is to provide a simple and easy-to-use testing environment for [Nitro](https://nitro.unjs.io) applications, built on top of [Vitest](https://vitest.dev).

## Features

- 🚀 Simple setup
- ✅ Seamless integration with Vitest
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

## Usage

Setting up the Nitro test environment for Vitest is as simple as creating a new `vitest.config.ts` configuration file in your project root.

```ts
import { defineNitroTestConfig } from 'nitro-test-utils/config'

export default defineNitroTestConfig({})
```

> [!TIP]
> Under the hood, the `defineNitroTestConfig` function will automatically spin up a Nitro server before running your tests and shut it down afterwards.

### Nitro Root Directory

If your Nitro server is located in a different directory, you can specify the `rootDir` option in the Nitro configuration. It should be the path to the `nitro.config.ts` configuration file:

```ts
import { defineNitroTestConfig } from 'nitro-test-utils/config'

export default defineNitroTestConfig({
  nitro: {
    // Set the root directory of your Nitro app
    rootDir: 'my/server',
  },
})
```

By default, the Vitest working directory is used.

## Testing

Write your tests in a dedicated location, e.g. a `tests` directory. You can use the `$fetch` function to make requests to the Nitro server that is started by the test environment.

A simple example could look like this:

```ts
import { describe, expect, it } from 'vitest'
import { $fetch } from 'nitro-test-utils'

describe('routes', () => {
  it('responds successfully', async () => {
    const { body, status } = await $fetch('/api/health')

    expect(status).toBe(200)
    expect(body).toMatchSnapshot()
  })
})
```

## Test Utils

### `$fetch`

The `$fetch` function is a simple wrapper around [`ofetch`](https://github.com/unjs/ofetch) and is used to make requests to your Nitro server during tests. It will dynamically include the base URL of the test server.

`$fetch` returns a promise that resolves with the following properties:

- `body`: The response body
- `status`: The response status code
- `headers`: The response headers

**Usage:**

Inside a test definition:

```ts
const { body, status, headers } = await $fetch('/api/hello')

expect(status).toBe(200)
expect(body).toMatchSnapshot()
```

**Type Declaration:**

```ts
declare function $fetch<T = any, R extends ResponseType = 'json'>(
  url: string,
  options?: FetchOptions<R>
): Promise<{
  body: T
  status: number
  headers: Record<string, string>
}>
```

> [!TIP]
> Fetch options will be merged with the default options.

## Roadmap

As of right now, the following features are planned:

- [ ] Rebuild server and rerun test when dependencies like routes change
- [ ] Better environment setup, maybe just like Nuxt test utils with `environment` Vitest option?
- [ ] Support `.env.test` files

## License

[MIT](./LICENSE) License © 2024-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
