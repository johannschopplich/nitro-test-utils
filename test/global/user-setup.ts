export async function setup() {
  // eslint-disable-next-line node/prefer-global/process
  process.env.NITRO_DYNAMIC_VALUE = 'injected-at-runtime'
}
