export { $fetchRaw, createNitroFetch, injectServerUrl, setup } from './e2e'
export type { NitroFetchResponse } from './e2e'

/** @deprecated Use `createNitroFetch` instead. */
export { createNitroFetch as createFetch } from './e2e'

export * from './types'
