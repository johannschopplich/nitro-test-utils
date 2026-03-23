import { defineHandler } from 'nitro'
import { useCloudflare } from '../utils/cloudflare'

export default defineHandler((event) => {
  const { env } = useCloudflare(event)

  return {
    hasEnv: !!env,
    bindings: Object.keys(env ?? {}),
  }
})
