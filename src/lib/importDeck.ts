import type { DecklistLine } from './decklist'
import { deckKeywords, type Deck } from './decks'
import type { ResolvedCard } from './scryfall'

/**
 * Builds a deck from a pasted list once Scryfall has resolved it. Pure, so the shape of an
 * imported deck is testable without a network.
 */
export function buildImportedDeck(
  name: string,
  resolved: ResolvedCard[],
  notFound: DecklistLine[],
  entryIdByKeyword: Map<string, string>,
  now: Date = new Date(),
): Deck {
  const commanders = resolved.filter((c) => c.isCommander)
  const trimmed = name.trim()
  const art = commanders.find((c) => c.artCrop)?.artCrop ?? resolved.find((c) => c.artCrop)?.artCrop
  return {
    id: `imported-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed !== '' ? trimmed : defaultDeckName(commanders),
    source: { kind: 'imported' },
    ...(art ? { art } : {}),
    commanders: commanders.map((c) => c.name),
    cardCount: resolved.reduce((n, c) => n + c.quantity, 0),
    updatedAt: now.toISOString(),
    keywords: deckKeywords(resolved, entryIdByKeyword),
    ...(notFound.length > 0 ? { unresolved: notFound.map((l) => l.raw) } : {}),
  }
}

/** "Yuriko, the Tiger's Shadow" becomes "Yuriko"; two commanders are joined with " & ". */
export function defaultDeckName(commanders: Array<{ name: string }>): string {
  if (commanders.length === 0) return 'Imported deck'
  return commanders.map((c) => c.name.split(/,| \/\/ /)[0].trim()).join(' & ')
}
