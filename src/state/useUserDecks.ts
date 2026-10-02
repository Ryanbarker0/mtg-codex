import { useCallback, useEffect, useState } from 'react'
import type { Deck } from '../lib/decks'
import { loadUserDecks, saveUserDecks } from '../lib/storage'

/** Decks imported on this device, loaded once and written through on every change. */
export function useUserDecks() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadUserDecks().then((stored) => {
      if (cancelled) return
      setDecks(stored)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((next: Deck[]) => {
    setDecks(next)
    saveUserDecks(next).catch((error: unknown) => console.error('Failed to save decks', error))
  }, [])

  const addDeck = useCallback((deck: Deck) => persist([deck, ...decks]), [decks, persist])
  const removeDeck = useCallback(
    (id: string) => persist(decks.filter((d) => d.id !== id)),
    [decks, persist],
  )

  return { decks, loaded, addDeck, removeDeck }
}
