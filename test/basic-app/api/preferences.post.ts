import { defineHandler, setCookie } from 'nitro/h3'

export default defineHandler((event) => {
  setCookie(event, 'filter', 'a=b; c')
  return { saved: true }
})
