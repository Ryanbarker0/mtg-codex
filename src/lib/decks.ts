/**
 * The shape of the generated deck data, shared by scripts/ingestDecks.ts and the app.
 *
 * Decks come from an Archidekt folder. Archidekt does not allow browser requests from other
 * origins, so the folder is read at build time and the result is committed. Each deck's
 * cards are resolved through Scryfall, whose `keywords` field uses the same names as the
 * codex, so every effect maps to a codex entry without guesswork.
 */

export interface DeckKeyword {
  /** The codex entry this keyword maps to. */
  entryId: string
  /** As Scryfall names it. */
  keyword: string
  /** Names of the cards in the deck that have it, in deck order. */
  cards: string[]
}

export interface Deck {
  id: number
  name: string
  url: string
  /** Archidekt's featured art for the deck. */
  art?: string
  commanders: string[]
  cardCount: number
  updatedAt: string
  keywords: DeckKeyword[]
}

export interface DecksData {
  generatedAt: string
  folder: {
    id: number
    name: string
    url: string
    owner: string
  }
  decks: Deck[]
}
