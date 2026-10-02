/**
 * The shape of a deck. Decks are pasted as text, resolved on Scryfall in the browser, and
 * kept in IndexedDB on the device; nothing ships with the app and nothing is hosted. A card's
 * keywords are Scryfall's own `keywords` list, which uses the same names as the codex, so
 * every mechanic maps to an entry without guesswork.
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
  id: string
  name: string
  /** The commander's art, from Scryfall. */
  art?: string
  commanders: string[]
  cardCount: number
  /** When the deck was imported. */
  importedAt: string
  keywords: DeckKeyword[]
  /** Lines of the pasted list that Scryfall could not match, kept so the owner can see them. */
  unresolved?: string[]
}

/** A card as the keyword grouping needs it. */
export interface KeywordedCard {
  name: string
  keywords: string[]
}

/**
 * Groups cards by keyword and maps each keyword to its codex entry by exact name. Names
 * the codex does not know (Scryfall lists flavor words such as "Grand Summon" alongside
 * keywords) are collected in `unknown` rather than dropped silently.
 */
export function deckKeywords(
  cards: KeywordedCard[],
  entryIdByKeyword: Map<string, string>,
  unknown: Set<string> = new Set(),
): DeckKeyword[] {
  const groups = new Map<string, string[]>()
  for (const card of cards) {
    for (const keyword of card.keywords) {
      const list = groups.get(keyword) ?? []
      if (!list.includes(card.name)) list.push(card.name)
      groups.set(keyword, list)
    }
  }
  const result: DeckKeyword[] = []
  for (const [keyword, names] of groups) {
    const entryId = entryIdByKeyword.get(keyword.toLowerCase())
    if (!entryId) {
      unknown.add(keyword)
      continue
    }
    result.push({ entryId, keyword, cards: names })
  }
  return result.sort((a, b) => a.keyword.localeCompare(b.keyword))
}
