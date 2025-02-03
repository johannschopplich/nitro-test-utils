// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['**/.nitro/**'],
}).append({
  rules: {
    'antfu/no-top-level-await': 'off',
  },
})
