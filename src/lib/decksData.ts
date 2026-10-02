import decksJson from '../data/decks.json'
import { codex } from './codexData'
import type { Deck, DecksData } from './decks'

/** The built-in decks and the lookups that work across built-in and imported decks. */
export const decksData = decksJson as unknown as DecksData
export const builtInDecks: Deck[] = decksData.decks

/** Scryfall keyword (lower case) to codex entry id, for grouping a deck's cards. */
export const entryIdByKeyword = new Map(
  codex.entries
    .filter((e) => e.scryfallKeyword !== undefined)
    .map((e) => [e.scryfallKeyword!.toLowerCase(), e.id] as const),
)

export interface DeckUse {
  deck: Deck
  cards: string[]
}

/** Which of the given decks use an entry, and with which cards. */
export function decksUsing(entryId: string, decks: Deck[]): DeckUse[] {
  const uses: DeckUse[] = []
  for (const deck of decks) {
    const keyword = deck.keywords.find((k) => k.entryId === entryId)
    if (keyword) uses.push({ deck, cards: keyword.cards })
  }
  return uses
}
