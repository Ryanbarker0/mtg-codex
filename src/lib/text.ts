/** Lower-cases and strips accents and curly punctuation so searches match however a name is typed. */
export function normaliseText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Straightens quotes and dashes without lowercasing, for text sent to Scryfall. */
export function straightenPunctuation(text: string): string {
  return text
    .replace(/[‘’‚‛′`´]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
}
