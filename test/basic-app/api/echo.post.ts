import { defineHandler } from 'nitro/h3'

export default defineHandler(async (event) => {
  const body = await event.req.json()
  return body
})
