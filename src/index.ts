export { $fetchRaw, createNitroFetch, createNitroSession, injectServerUrl, setup } from './e2e'
export type { NitroFetchResponse, NitroSession } from './e2e'

/** @deprecated Use `createNitroFetch` instead. */
export { createNitroFetch as createFetch } from './e2e'

export * from './types'
