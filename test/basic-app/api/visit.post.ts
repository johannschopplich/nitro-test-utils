import { defineHandler, setCookie } from 'nitro/h3'

export default defineHandler((event) => {
  // `cookie-es` rejects a cookie named after an `Object.prototype` key.
  event.res.headers.append('set-cookie', '__proto__=polluted')
  setCookie(event, 'visited', 'yes')
  return { visited: true }
})
