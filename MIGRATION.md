# Migration Guide

## From v3 to v4

v4 builds on the testing primitives of Nitro 3.0.261029-rc. Requests go through Nitro's own `serverFetch`, and production mode serves the build through Nitro's preview, so Cloudflare presets work in production too.

### Update the Peer Dependencies

v4 requires `nitro@^3.0.261029-rc` and Vitest v4 or v5.

### Import From the Package Root

The `nitro-test-utils/e2e` entry is gone. Everything it exported that still exists now comes from the package root:

```diff
-import { $fetchRaw, setup } from 'nitro-test-utils/e2e'
+import { $serverFetch, setup } from 'nitro-test-utils'
```

### Rename `$fetchRaw` to `$serverFetch`

`$serverFetch` takes the same arguments, applies the same fetch defaults, and returns the same response shape:

```diff
-const { data, status } = await $fetchRaw('/api/health')
+const { data, status } = await $serverFetch('/api/health')
```

### Replace `injectNitroFetch` With `serverFetch`

The test server registers itself for `serverFetch` from `nitro`, which accepts a path, a URL, or a `Request`:

```diff
-import { injectNitroFetch } from 'nitro-test-utils/e2e'
-const nitroFetch = injectNitroFetch()
-const response = await nitroFetch(new Request('http://nitro.test/api/health'))
+import { serverFetch } from 'nitro'
+const response = await serverFetch('/api/health')
```

### Replace `createNitroFetch`

For one-off requests, use `$serverFetch`. For a session with cookies, use `createNitroSession`. If you need your own ofetch instance with interceptors, create it on top of `serverFetch`:

```ts
import { serverFetch } from 'nitro'
import { ofetch } from 'ofetch'

const $fetch = ofetch.create(
  {
    baseURL: 'http://nitro.test',
    ignoreResponseError: true,
    retry: 0,
    headers: { accept: 'application/json' },
    onRequest({ options }) {
      // …
    },
  },
  {
    fetch: (input, init) => serverFetch(input, init)
  },
)
```

### Check `import.meta.envName` Instead of `import.meta.test`

v4 no longer replaces `import.meta.test`. Nitro exposes the env name as `import.meta.envName`, and the test server builds with the env name `test`:

```diff
-if (import.meta.test) {
+if (import.meta.envName === 'test') {
```

Nitro types `import.meta.envName` itself, so remove the `nitro-test-utils/env` reference from your `.d.ts` files:

```diff
-/// <reference types="nitro-test-utils/env" />
```

### Production Mode Runs Your Preset's Build

Production mode now builds with your preset and serves the output through Nitro's preview:

- The default production preset is `standard` instead of `node-middleware`.
- Cloudflare presets work in per-suite production mode and need `wrangler` installed. Global production mode rejects them.
- Production mode accepts only `standard`, `node-server`, and Cloudflare presets. Others, such as `node-middleware` or `aws-lambda`, are rejected.
- Each production build goes to its own directory under `node_modules/.nitro/output/<preset>` instead of `.output`.

### Drop `NitroTestContext` Imports

The type is no longer exported. No public API returns or accepts it.

## From v2 to v3

### In-Process Request Dispatch

v3 stops starting a real HTTP listener for your tests. Instead, the Nitro app is dispatched in-process – each request is handed directly to the app's Web `Request` handler, the same code path every cloud preset invokes at runtime. No ports, no sockets, no localhost round-trip.

This removes `injectServerUrl`. Replace it with `injectNitroFetch`, which returns the raw request dispatcher:

```diff
-import { injectServerUrl } from 'nitro-test-utils/e2e'
-const url = injectServerUrl()
+import { injectNitroFetch } from 'nitro-test-utils/e2e'
+const nitroFetch = injectNitroFetch()
+const response = await nitroFetch(new Request('http://nitro.test/api/health'))
```

## From v1 to v2

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

## From v0.x (Nitro v2 Support) to v1.x (Nitro v3 Support)

If you are upgrading from an earlier version of `nitro-test-utils` that targeted Nitro v2 (`nitropack`), the following breaking changes apply:

- **Peer dependency**: `nitropack` replaced by `nitro` (v3).
- **Renamed types**: `TestOptions` → `NitroTestOptions`, `TestContext` → `NitroTestContext`, `TestFetchResponse` → `NitroFetchResponse`.

For Nitro v3 API changes, see the [official Nitro v3 migration guide](https://nitro.build/guide/migration).
