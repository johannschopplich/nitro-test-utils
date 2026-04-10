export { $fetchRaw, createNitroFetch, createNitroSession, injectServerUrl, listRoutes, setup } from './e2e'
export type { NitroFetchResponse, NitroRouteInfo, NitroSession } from './e2e'

/** @deprecated Use `createNitroFetch` instead. */
export { createNitroFetch as createFetch } from './e2e'

export * from './types'
