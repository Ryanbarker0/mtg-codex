import type { DecklistLine } from './decklist'
import { deckKeywords, type Deck, type TextKeyword } from './decks'
import type { ResolvedCard } from './scryfall'

/**
 * Builds a deck from a pasted list once Scryfall has resolved it. Pure, so the shape of an
 * imported deck is testable without a network.
 */
export function buildImportedDeck(
  name: string,
  list: string,
  resolved: ResolvedCard[],
  notFound: DecklistLine[],
  entryIdByKeyword: Map<string, string>,
  textKeywords: TextKeyword[] = [],
  now: Date = new Date(),
): Deck {
  const commanders = resolved.filter((c) => c.isCommander)
  const trimmed = name.trim()
  return {
    id: `imported-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed !== '' ? trimmed : defaultDeckName(commanders),
    list,
    importedAt: now.toISOString(),
    ...resolvedFields(resolved, notFound, entryIdByKeyword, textKeywords),
  }
}

/**
 * The same deck with its cards resolved again, for when Scryfall data or the app's reading
 * of it has improved since the import. Identity, name and import date are kept.
 */
export function refreshDeck(
  deck: Deck,
  resolved: ResolvedCard[],
  notFound: DecklistLine[],
  entryIdByKeyword: Map<string, string>,
  textKeywords: TextKeyword[] = [],
): Deck {
  const { unresolved: _dropped, ...kept } = deck
  return { ...kept, ...resolvedFields(resolved, notFound, entryIdByKeyword, textKeywords) }
}

function resolvedFields(
  resolved: ResolvedCard[],
  notFound: DecklistLine[],
  entryIdByKeyword: Map<string, string>,
  textKeywords: TextKeyword[],
): Pick<Deck, 'art' | 'commanders' | 'cardCount' | 'keywords' | 'unresolved'> {
  const commanders = resolved.filter((c) => c.isCommander)
  const art = commanders.find((c) => c.artCrop)?.artCrop ?? resolved.find((c) => c.artCrop)?.artCrop
  return {
    ...(art ? { art } : {}),
    commanders: commanders.map((c) => c.name),
    cardCount: resolved.reduce((n, c) => n + c.quantity, 0),
    keywords: deckKeywords(resolved, entryIdByKeyword, new Set(), textKeywords),
    ...(notFound.length > 0 ? { unresolved: notFound.map((l) => l.raw) } : {}),
  }
}

/** "Yuriko, the Tiger's Shadow" becomes "Yuriko"; two commanders are joined with " & ". */
export function defaultDeckName(commanders: Array<{ name: string }>): string {
  if (commanders.length === 0) return 'Imported deck'
  return commanders.map((c) => c.name.split(/,| \/\/ /)[0].trim()).join(' & ')
}
