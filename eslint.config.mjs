// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['**/.nitro/**'],
  rules: {
    'antfu/no-top-level-await': 'off',
  },
})
