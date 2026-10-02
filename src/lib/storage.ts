import { createStore, get, set } from 'idb-keyval'
import type { Deck } from './decks'

/**
 * Imported decks live in IndexedDB on the device. The app is fully static and single-user,
 * so the device is the only copy; there is no sync.
 */

const store = createStore('mtg-codex', 'state')
const DECKS_KEY = 'decks'

export async function loadUserDecks(): Promise<Deck[]> {
  try {
    return (await get<Deck[]>(DECKS_KEY, store)) ?? []
  } catch {
    return []
  }
}

export async function saveUserDecks(decks: Deck[]): Promise<void> {
  await set(DECKS_KEY, decks, store)
}
