import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    nitro(),
    // `virtual:builder`, resolvable only when Vite builds the app, which the Nitro dev server doesn't.
    {
      name: 'builder',
      resolveId: id => id === 'virtual:builder'
        ? '\0virtual:builder'
        : undefined,
      load: id => id === '\0virtual:builder'
        ? 'export default \'vite\''
        : undefined,
    },
  ],
})
