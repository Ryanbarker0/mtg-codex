import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Codex } from '../src/lib/codex.ts'
import type { Deck, DeckKeyword, DecksData } from '../src/lib/decks.ts'
import {
  ARCHIDEKT,
  deckUrl,
  folderFromHtml,
  folderUrl,
  includedCards,
  type ArchidektDeck,
  type DeckCard,
} from './lib/archidekt.ts'

/**
 * Builds src/data/decks.json from an Archidekt folder.
 *
 * For each deck in the folder, every included card is looked up on Scryfall by its Scryfall
 * id, and the card's `keywords` (Scryfall's own list of keyword abilities, keyword actions
 * and ability words on the card) are mapped to codex entries by exact name. Keywords the
 * codex does not know are reported rather than dropped silently.
 *
 * Run with `npm run ingest:decks`. Archidekt blocks browser requests from other origins, so
 * this cannot happen in the app; the output is committed instead.
 */

const FOLDER_ID = Number(process.env.ARCHIDEKT_FOLDER ?? '1553499')
const SCRYFALL = 'https://api.scryfall.com'
const USER_AGENT = 'mtg-codex-ingest/0.1 (https://github.com/Ryanbarker0/mtg-codex)'
const OUTPUT = path.resolve(import.meta.dirname, '../src/data/decks.json')
const CODEX = path.resolve(import.meta.dirname, '../src/data/codex.json')
const BATCH_SIZE = 75
const REQUEST_GAP_MS = 150

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`)
  return response.text()
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(init?.headers ?? {}) },
  })
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`)
  return (await response.json()) as T
}

interface ScryfallCard {
  id: string
  name: string
  keywords?: string[]
}

interface CollectionResponse {
  data: ScryfallCard[]
  not_found: Array<Record<string, string>>
}

/** Scryfall keywords for each card, by Scryfall id; cards Scryfall cannot find are reported. */
async function keywordsByCard(cards: DeckCard[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  const ids = [...new Set(cards.map((c) => c.uid))]
  for (let start = 0; start < ids.length; start += BATCH_SIZE) {
    if (start > 0) await sleep(REQUEST_GAP_MS)
    const batch = ids.slice(start, start + BATCH_SIZE)
    const response = await fetchJson<CollectionResponse>(`${SCRYFALL}/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch.map((id) => ({ id })) }),
    })
    for (const card of response.data) result.set(card.id, card.keywords ?? [])
    for (const missing of response.not_found) {
      const name = cards.find((c) => c.uid === missing.id)?.name ?? missing.id
      console.warn(`  scryfall: no card with id ${missing.id} (${name})`)
    }
  }
  return result
}

/** Groups a deck's cards by keyword and maps each keyword to its codex entry. */
export function deckKeywords(
  cards: DeckCard[],
  keywords: Map<string, string[]>,
  entryIdByKeyword: Map<string, string>,
  unknown: Set<string>,
): DeckKeyword[] {
  const groups = new Map<string, string[]>()
  for (const card of cards) {
    for (const keyword of keywords.get(card.uid) ?? []) {
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

async function main() {
  const codex = JSON.parse(await readFile(CODEX, 'utf8')) as Codex
  const entryIdByKeyword = new Map(
    codex.entries
      .filter((e) => e.scryfallKeyword)
      .map((e) => [e.scryfallKeyword!.toLowerCase(), e.id] as const),
  )

  console.log(`Archidekt: folder ${FOLDER_ID}…`)
  const folder = folderFromHtml(await fetchText(folderUrl(FOLDER_ID)))
  console.log(`  "${folder.name}" by ${folder.owner}: ${folder.decks.length} decks`)
  if (folder.next) console.warn('  folder has more pages than were read; only the first is used')

  const unknown = new Set<string>()
  const decks: Deck[] = []
  for (const summary of folder.decks) {
    await sleep(REQUEST_GAP_MS)
    const deck = await fetchJson<ArchidektDeck>(`${ARCHIDEKT}/api/decks/${summary.id}/`)
    const cards = includedCards(deck)
    const keywords = await keywordsByCard(cards)
    const grouped = deckKeywords(cards, keywords, entryIdByKeyword, unknown)
    const cardCount = cards.reduce((n, c) => n + c.quantity, 0)
    const commanders = cards.filter((c) => c.isCommander).map((c) => c.name)
    console.log(
      `  ${deck.name}: ${cardCount} cards, ${commanders.join(' / ') || 'no commander category'}, ${grouped.length} keywords`,
    )
    decks.push({
      id: deck.id,
      name: deck.name,
      url: deckUrl(deck.id),
      ...(deck.featured ? { art: deck.featured } : {}),
      commanders,
      cardCount,
      updatedAt: deck.updatedAt,
      keywords: grouped,
    })
  }
  decks.sort((a, b) => a.name.localeCompare(b.name))

  const data: DecksData = {
    generatedAt: new Date().toISOString(),
    folder: {
      id: folder.id,
      name: folder.name,
      url: folderUrl(folder.id),
      owner: folder.owner,
    },
    decks,
  }
  await mkdir(path.dirname(OUTPUT), { recursive: true })
  const json = JSON.stringify(data, null, 2)
  await writeFile(OUTPUT, `${json}\n`)
  console.log(`Wrote ${OUTPUT} (${(json.length / 1024).toFixed(0)} KB)`)
  if (unknown.size > 0) {
    console.warn(`  keywords with no codex entry (left out): ${[...unknown].sort().join(', ')}`)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
