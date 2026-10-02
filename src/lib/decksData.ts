import decksJson from '../data/decks.json'
import type { Deck, DecksData } from './decks'

/** The generated deck data and the lookups the app needs from it. */
export const decksData = decksJson as unknown as DecksData

export const decksById = new Map(decksData.decks.map((d) => [d.id, d]))

export interface DeckUse {
  deck: Deck
  cards: string[]
}

/** Which of the decks use an entry, and with which cards. */
export function decksUsing(entryId: string): DeckUse[] {
  const uses: DeckUse[] = []
  for (const deck of decksData.decks) {
    const keyword = deck.keywords.find((k) => k.entryId === entryId)
    if (keyword) uses.push({ deck, cards: keyword.cards })
  }
  return uses
}
