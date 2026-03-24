import { defineHandler } from 'nitro/h3'
import { useCloudflare } from '../utils/cloudflare'

export default defineHandler(async (event) => {
  const { env } = useCloudflare(event)
  const url = new URL(event.req.url, 'http://localhost')
  const key = url.searchParams.get('key')

  if (!key) {
    return { error: 'Missing key parameter' }
  }

  const value = await env.KV.get(key)

  return { key, value }
})
