/**
 * Normalises text for matching names typed on a touch keyboard against Scryfall and the
 * rules. iOS smart punctuation turns ' into ’ and " into “ ”, and people type names without
 * accents ("Lim-Dul" for "Lim-Dûl"), so both sides of every comparison go through this.
 */
export function normaliseText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‘’‚‛′`´]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .toLowerCase()
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
