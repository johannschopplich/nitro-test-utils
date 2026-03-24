import { defineHandler, HTTPError } from 'nitro/h3'

export default defineHandler(() => {
  throw new HTTPError({ status: 422, statusText: 'Unprocessable Entity', message: 'Validation failed' })
})
