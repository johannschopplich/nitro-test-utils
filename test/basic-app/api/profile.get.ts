import { defineHandler, HTTPError } from 'nitro/h3'

export default defineHandler((event) => {
  const cookieHeader = event.req.headers.get('cookie') || ''
  const session = cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith('session='))

  if (!session) {
    throw new HTTPError({ status: 401, statusText: 'Unauthorized' })
  }

  return { user: 'authenticated' }
})
