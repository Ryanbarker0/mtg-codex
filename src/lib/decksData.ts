import { codex } from './codexData'
import type { Deck, TextKeyword } from './decks'

/** Scryfall keyword (lower case) to codex entry id, for grouping a deck's cards. */
export const entryIdByKeyword = new Map(
  codex.entries
    .filter((e) => e.scryfallKeyword !== undefined)
    .map((e) => [e.scryfallKeyword!.toLowerCase(), e.id] as const),
)

/**
 * Keyword abilities to look for in rules text. Keyword actions are left out because their
 * names are everyday verbs in card text (destroy, exile, sacrifice), and ability words
 * because Scryfall already tags the cards that carry them.
 */
export const textKeywords: TextKeyword[] = codex.entries
  .filter((e) => e.kind === 'keyword-ability' && /^[A-Za-z][A-Za-z' -]+$/.test(e.name))
  .map((e) => ({ name: e.name, entryId: e.id }))

export interface DeckUse {
  deck: Deck
  cards: string[]
  mentionedBy: string[]
}

/** Which decks use an entry, with the cards that have it and the cards that name it. */
export function decksUsing(entryId: string, decks: Deck[]): DeckUse[] {
  const uses: DeckUse[] = []
  for (const deck of decks) {
    const keyword = deck.keywords.find((k) => k.entryId === entryId)
    if (keyword) uses.push({ deck, cards: keyword.cards, mentionedBy: keyword.mentionedBy ?? [] })
  }
  return uses
}
