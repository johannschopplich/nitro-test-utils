import { defineHandler } from 'nitro'
import { useCloudflare } from '../utils/cloudflare'

export default defineHandler(async (event) => {
  const { env } = useCloudflare(event)
  const body = await event.req.json() as { name: string }

  await env.DB.exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)')
  const result = await env.DB.prepare('INSERT INTO items (name) VALUES (?)').bind(body.name).run()

  return { ok: true, id: result.meta.last_row_id }
})
