import { defineHandler } from 'nitro/h3'

export default defineHandler(event => ({
  cookie: event.req.headers.get('cookie'),
}))
