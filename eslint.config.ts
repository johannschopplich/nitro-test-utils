import type { ConfigNames, TypedFlatConfigItem } from '@antfu/eslint-config'
import type { FlatConfigComposer } from 'eslint-flat-config-utils'
import antfu from '@antfu/eslint-config'

const config: FlatConfigComposer<TypedFlatConfigItem, ConfigNames> = antfu({
  ignores: ['**/.nitro/**'],
}).append({
  rules: {
    'antfu/no-top-level-await': 'off',
  },
})

export default config
