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
}

interface ScryfallCard {
  id: string
  name: string
  type_line: string
  scryfall_uri: string
  image_uris?: ImageUris
  card_faces?: Array<{ image_uris?: ImageUris }>
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
