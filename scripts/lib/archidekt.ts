/**
 * Readers for Archidekt. The folder page is a Next.js page whose server state is embedded
 * as JSON; the deck endpoint is a plain JSON API. Only the fields the codex needs are typed.
 */

export const ARCHIDEKT = 'https://archidekt.com'

export interface FolderDeck {
  id: number
  name: string
  updatedAt: string
  featured?: string
}

export interface Folder {
  id: number
  name: string
  owner: string
  decks: FolderDeck[]
  /** Non-null when the folder has more decks than one page shows. */
  next: string | null
}

export interface ArchidektDeck {
  id: number
  name: string
  updatedAt: string
  featured?: string
  categories: Array<{ name: string; includedInDeck: boolean; isPremier: boolean }>
  cards: Array<{
    quantity: number
    categories: string[] | null
    card: {
      uid: string
      oracleCard: { name: string }
    }
  }>
}

interface NextData {
  props: {
    pageProps: {
      redux: {
        folders: {
          rootFolder: {
            id: number
            name: string
            owner: { username: string }
            decks: FolderDeck[]
            next: string | null
          }
        }
      }
    }
  }
}

/** Pulls the folder out of the page's embedded Next.js state. */
export function folderFromHtml(html: string): Folder {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)
  if (!match) throw new Error('Archidekt folder page has no embedded state')
  const data = JSON.parse(match[1]) as NextData
  const root = data.props?.pageProps?.redux?.folders?.rootFolder
  if (!root) throw new Error('Archidekt folder state has no rootFolder')
  return {
    id: root.id,
    name: root.name,
    owner: root.owner.username,
    decks: root.decks.map((d) => ({
      id: d.id,
      name: d.name,
      updatedAt: d.updatedAt,
      featured: d.featured,
    })),
    next: root.next,
  }
}

export interface DeckCard {
  uid: string
  name: string
  quantity: number
  isCommander: boolean
}

/**
 * The cards that are actually in the deck: Archidekt marks categories such as Maybeboard as
 * not included, and a card is left out if every one of its categories is excluded. The
 * premier category (Commander) marks the commanders.
 */
export function includedCards(deck: ArchidektDeck): DeckCard[] {
  const excluded = new Set(deck.categories.filter((c) => !c.includedInDeck).map((c) => c.name))
  const premier = new Set(deck.categories.filter((c) => c.isPremier).map((c) => c.name))
  const cards: DeckCard[] = []
  for (const entry of deck.cards) {
    const categories = entry.categories ?? []
    if (categories.length > 0 && categories.every((c) => excluded.has(c))) continue
    cards.push({
      uid: entry.card.uid,
      name: entry.card.oracleCard.name,
      quantity: entry.quantity,
      isCommander: categories.some((c) => premier.has(c)),
    })
  }
  return cards
}

export function deckUrl(id: number): string {
  return `${ARCHIDEKT}/decks/${id}`
}

export function folderUrl(id: number): string {
  return `${ARCHIDEKT}/folders/${id}`
}
