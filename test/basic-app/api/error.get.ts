import { defineHandler, HTTPError } from 'nitro'

export default defineHandler(() => {
  throw new HTTPError({ status: 422, statusText: 'Unprocessable Entity', message: 'Validation failed' })
})
