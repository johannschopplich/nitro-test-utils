import { defineHandler, deleteCookie, getQuery, setCookie } from 'nitro/h3'

export default defineHandler((event) => {
  const { via } = getQuery(event)

  if (via === 'expires') {
    setCookie(event, 'session', 'stale', {
      expires: new Date(0),
    })
  }
  else if (via === 'max-age-over-expires') {
    setCookie(event, 'session', 'fresh', {
      maxAge: 60,
      expires: new Date(0),
    })
  }
  else {
    deleteCookie(event, 'session')
  }

  return { loggedIn: false }
})
