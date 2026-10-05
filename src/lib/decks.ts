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
  /**
   * Cards that do not have the keyword but name it in their rules text, such as Zhulodok
   * granting cascade. Found by a whole-word match on the oracle text with reminder text
   * removed, so "creatures with flying" counts as naming flying.
   */
  mentionedBy?: string[]
}

export interface Deck {
  id: string
  name: string
  /** The pasted list, kept so the deck can be checked against Scryfall again. */
  list?: string
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
  /** Oracle text, scanned for keyword abilities the card grants or names. */
  text?: string
}

/** A keyword ability that can be looked for in rules text. */
export interface TextKeyword {
  name: string
  entryId: string
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Oracle text without reminder text, which restates keywords the card already has. */
export function withoutReminderText(text: string): string {
  return text.replace(/\([^)]*\)/g, ' ')
}

/**
 * Groups cards by keyword and maps each keyword to its codex entry by exact name. Names
 * the codex does not know (Scryfall lists flavor words such as "Grand Summon" alongside
 * keywords) are collected in `unknown` rather than dropped silently.
 *
 * When `textKeywords` is given, each card's rules text is also searched for those keyword
 * abilities as whole words. A card that names a keyword it does not have is recorded under
 * `mentionedBy`, which is how a deck shows cascade when only Zhulodok grants it.
 */
export function deckKeywords(
  cards: KeywordedCard[],
  entryIdByKeyword: Map<string, string>,
  unknown: Set<string> = new Set(),
  textKeywords: TextKeyword[] = [],
): DeckKeyword[] {
  const groups = new Map<string, { cards: string[]; mentionedBy: string[] }>()
  const group = (keyword: string) => {
    const existing = groups.get(keyword)
    if (existing) return existing
    const created = { cards: [], mentionedBy: [] }
    groups.set(keyword, created)
    return created
  }
  const patterns = textKeywords.map((k) => ({
    ...k,
    pattern: new RegExp(`\\b${escapeRegExp(k.name)}\\b`, 'i'),
  }))

  for (const card of cards) {
    const own = new Set(card.keywords.map((k) => k.toLowerCase()))
    for (const keyword of card.keywords) {
      const g = group(keyword)
      if (!g.cards.includes(card.name)) g.cards.push(card.name)
    }
    if (card.text) {
      const text = withoutReminderText(card.text)
      for (const k of patterns) {
        if (own.has(k.name.toLowerCase()) || !k.pattern.test(text)) continue
        const g = group(k.name)
        if (!g.cards.includes(card.name) && !g.mentionedBy.includes(card.name)) {
          g.mentionedBy.push(card.name)
        }
      }
    }
  }

  const result: DeckKeyword[] = []
  for (const [keyword, g] of groups) {
    const entryId = entryIdByKeyword.get(keyword.toLowerCase())
    if (!entryId) {
      unknown.add(keyword)
      continue
    }
    result.push({
      entryId,
      keyword,
      cards: g.cards,
      ...(g.mentionedBy.length > 0 ? { mentionedBy: g.mentionedBy } : {}),
    })
  }
  return result.sort((a, b) => a.keyword.localeCompare(b.keyword))
}
