/**
 * Live example cards from the public Scryfall API (https://scryfall.com/docs/api).
 *
 * The codex itself never depends on Scryfall at runtime; this only decorates an entry
 * with cards that carry the keyword, ordered by how often they are played in Commander.
 */

const API = 'https://api.scryfall.com'
const SITE = 'https://scryfall.com'
export const EXAMPLE_LIMIT = 12

export interface ExampleCard {
  id: string
  name: string
  typeLine: string
  imageSmall?: string
  imageNormal?: string
  scryfallUri: string
}

export interface ExampleCards {
  total: number
  cards: ExampleCard[]
  /** The same search on scryfall.com, for the full list. */
  searchUrl: string
}

interface ImageUris {
  small?: string
  normal?: string
  art_crop?: string
}

interface ScryfallCard {
  id: string
  name: string
  type_line: string
  scryfall_uri: string
  image_uris?: ImageUris
  card_faces?: Array<{ name?: string; oracle_text?: string; image_uris?: ImageUris }>
}

interface SearchResponse {
  total_cards: number
  data: ScryfallCard[]
}

/** Only paper cards, without silver-border and playtest cards, most played in Commander first. */
export function searchQuery(keyword: string): string {
  return `keyword:"${keyword}" game:paper -is:funny`
}

export async function fetchExampleCards(keyword: string): Promise<ExampleCards> {
  const params = new URLSearchParams({
    q: searchQuery(keyword),
    order: 'edhrec',
    unique: 'cards',
  })
  const searchUrl = `${SITE}/search?${params}`
  const response = await fetch(`${API}/cards/search?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (response.status === 404) return { total: 0, cards: [], searchUrl }
  if (!response.ok) throw new Error(`Scryfall ${response.status}: ${response.statusText}`)
  const body = (await response.json()) as SearchResponse
  return {
    total: body.total_cards,
    cards: body.data.slice(0, EXAMPLE_LIMIT).map(toExampleCard),
    searchUrl,
  }
}

export function toExampleCard(card: ScryfallCard): ExampleCard {
  // Double-faced cards carry their images per face; the front face is shown.
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris
  return {
    id: card.id,
    name: card.name,
    typeLine: card.type_line,
    imageSmall: images?.small,
    imageNormal: images?.normal,
    scryfallUri: card.scryfall_uri,
  }
}

/* Deck import: resolving a pasted list. */

const BATCH_SIZE = 75
const REQUEST_GAP_MS = 120

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface ResolvedCard {
  name: string
  scryfallId: string
  typeLine: string
  /** Scryfall's list of keyword abilities, keyword actions and ability words on the card. */
  keywords: string[]
  /** Oracle text of every face, so keywords the card grants or names can be found too. */
  text: string
  artCrop?: string
  quantity: number
  isCommander: boolean
}

export interface LookupResult {
  resolved: ResolvedCard[]
  notFound: DecklistLine[]
}

interface DecklistLine {
  quantity: number
  name: string
  set?: string
  collectorNumber?: string
  isCommander: boolean
  raw: string
}

interface CollectionCard extends ScryfallCard {
  keywords?: string[]
  oracle_text?: string
  set: string
  collector_number: string
}

interface CollectionResponse {
  data: CollectionCard[]
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.json()) as { details?: string }
      if (body.details) detail = body.details
    } catch {
      // Body was not JSON; keep the status text.
    }
    throw new Error(`Scryfall ${response.status}: ${detail}`)
  }
  return (await response.json()) as T
}

const normalise = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘]/g, "'").trim()

/**
 * Finds the card a list line asked for among a collection response. A printing match
 * (set and collector number) is only accepted when the name agrees too, because a stale
 * collector number is far more likely than a wrong name.
 */
export function matchCollectionCard(
  line: DecklistLine,
  cards: CollectionCard[],
  byPrinting: boolean,
): CollectionCard | undefined {
  const wanted = normalise(line.name)
  const nameMatches = (c: CollectionCard) =>
    normalise(c.name) === wanted ||
    normalise(c.name).startsWith(`${wanted} //`) ||
    (c.card_faces ?? []).some((f) => f.name !== undefined && normalise(f.name) === wanted)
  if (byPrinting && line.set && line.collectorNumber) {
    const printing = cards.find(
      (c) =>
        c.set.toLowerCase() === line.set &&
        c.collector_number.toLowerCase() === line.collectorNumber!.toLowerCase(),
    )
    return printing && nameMatches(printing) ? printing : undefined
  }
  return cards.find(nameMatches)
}

function toResolved(card: CollectionCard, line: DecklistLine): ResolvedCard {
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris
  return {
    name: card.name,
    scryfallId: card.id,
    typeLine: card.type_line,
    keywords: card.keywords ?? [],
    text: card.oracle_text ?? (card.card_faces ?? []).map((f) => f.oracle_text ?? '').join('\n'),
    artCrop: images?.art_crop,
    quantity: line.quantity,
    isCommander: line.isCommander,
  }
}

/**
 * Looks up every line of a pasted decklist. Lines with a set and collector number are
 * requested by printing; the rest by exact name. Anything Scryfall cannot match by printing
 * is retried by name, and anything still missing is retried with fuzzy matching so minor
 * typos still resolve.
 */
export async function lookupDecklist(
  lines: DecklistLine[],
  onProgress?: (done: number, total: number) => void,
): Promise<LookupResult> {
  const resolved: ResolvedCard[] = []
  let done = 0
  const report = () => onProgress?.(done, lines.length)

  const runBatches = async (items: DecklistLine[], byPrinting: boolean) => {
    const missing: DecklistLine[] = []
    for (let start = 0; start < items.length; start += BATCH_SIZE) {
      if (start > 0) await sleep(REQUEST_GAP_MS)
      const batch = items.slice(start, start + BATCH_SIZE)
      const response = await requestJson<CollectionResponse>('/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifiers: batch.map((l) =>
            byPrinting && l.set && l.collectorNumber
              ? { set: l.set, collector_number: l.collectorNumber }
              : { name: l.name },
          ),
        }),
      })
      for (const line of batch) {
        const card = matchCollectionCard(line, response.data, byPrinting)
        if (card) {
          resolved.push(toResolved(card, line))
          done += 1
          report()
        } else {
          missing.push(line)
        }
      }
    }
    return missing
  }

  let pending = await runBatches(lines, true)
  if (pending.length > 0) pending = await runBatches(pending, false)

  const notFound: DecklistLine[] = []
  for (const line of pending) {
    await sleep(REQUEST_GAP_MS)
    try {
      const card = await requestJson<CollectionCard>(
        `/cards/named?fuzzy=${encodeURIComponent(line.name)}`,
      )
      resolved.push(toResolved(card, line))
      done += 1
      report()
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Scryfall 404')) notFound.push(line)
      else throw error
    }
  }

  return { resolved, notFound }
}
