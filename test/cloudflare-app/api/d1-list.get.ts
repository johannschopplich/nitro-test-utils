import { defineHandler } from 'nitro/h3'
import { useCloudflare } from '../utils/cloudflare'

export default defineHandler(async (event) => {
  const { env } = useCloudflare(event)

  await env.DB.exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)')
  const { results } = await env.DB.prepare('SELECT * FROM items').all()

  return { items: results }
})
