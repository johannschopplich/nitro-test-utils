import { defineHandler, setCookie } from 'nitro/h3'

export default defineHandler((event) => {
  setCookie(event, 'session', 'abc123')
  return { loggedIn: true }
})
