import type { D1Database, ExecutionContext, IncomingRequestCfProperties, KVNamespace } from '@cloudflare/workers-types/experimental'
import type { H3Event } from 'nitro/h3'

interface CloudflareEnv {
  DB: D1Database
  KV: KVNamespace
}

export function useCloudflare(event: H3Event) {
  const context = event.req as any

  return {
    env: context.runtime.cloudflare.env as CloudflareEnv,
    ctx: context.runtime.cloudflare.context as ExecutionContext,
    cf: context.cf as IncomingRequestCfProperties,
  }
}
