const urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict' as const

/**
 * Generates a random string.
 *
 * @remarks Ported from `nanoid`.
 * @see https://github.com/ai/nanoid
 */
export function generateRandomId(size = 21, dict = urlAlphabet) {
  let id = ''
  // A compact alternative for `for (var i = 0; i < step; i++)`.
  let i = size
  const len = dict.length
  while (i--) {
    // `| 0` is more compact and faster than `Math.floor()`.
    id += dict[(Math.random() * len) | 0]
  }
  return id
}
