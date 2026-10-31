import type { NitroEventHandler } from 'nitro/types'
import { injectTestContext } from './context'

export interface NitroRouteInfo {
  /** HTTP pathname pattern (e.g. `/api/users`, `/api/users/:id`). */
  route: string
  /** HTTP method, or `undefined` when the handler matches any method. */
  method?: string
}

/**
 * Lists every route registered with the active Nitro test app,
 * excluding internal routes prefixed with `/_` or `/api/_`.
 *
 * @throws if called without an active Nitro test context.
 */
export function listRoutes(): NitroRouteInfo[] {
  const nitro = injectTestContext()?.nitro

  if (!nitro) {
    throw new Error('Nitro test app is not running. Did you call `setup()`?')
  }

  const sources: NitroEventHandler[] = [
    ...nitro.scannedHandlers,
    ...nitro.options.handlers,
  ]

  const seenKeys = new Set<string>()
  const routes: NitroRouteInfo[] = []

  for (const { route, method } of sources) {
    if (!route)
      continue

    if (route.startsWith('/_') || route.startsWith('/api/_'))
      continue

    const key = `${method ?? '*'} ${route}`
    if (seenKeys.has(key))
      continue

    seenKeys.add(key)
    routes.push({ route, method: method || undefined })
  }

  return routes
}
