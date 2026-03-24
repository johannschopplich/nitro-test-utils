import { defineHandler } from 'nitro/h3'
import { useCloudflare } from '../utils/cloudflare'

export default defineHandler((event) => {
  const { env } = useCloudflare(event)

  return {
    hasEnv: !!env,
    bindings: Object.keys(env ?? {}),
  }
})
