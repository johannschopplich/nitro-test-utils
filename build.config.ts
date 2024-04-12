import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/e2e', 'src/config', 'src/setup'],
  externals: ['vite', 'vitest', 'vitest/config'],
  clean: true,
  declaration: true,
})
