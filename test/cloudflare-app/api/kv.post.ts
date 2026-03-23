import { defineHandler } from 'nitro'
import { useCloudflare } from '../utils/cloudflare'

export default defineHandler(async (event) => {
  const { env } = useCloudflare(event)

  const body = await event.req.json() as { key: string, value: string }
  await env.KV.put(body.key, body.value)

  return { ok: true }
})
