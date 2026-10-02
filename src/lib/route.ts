import { useEffect, useState } from 'react'

/**
 * Hash routing, so every screen has a shareable address and the browser's back gesture
 * works. "#/" is the codex, "#/e/<id>" an entry, "#/decks" the deck list and
 * "#/decks/<id>" a deck.
 */

export type Route =
  { view: 'codex'; entryId: string | null } | { view: 'decks'; deckId: number | null }

export const CODEX_ROOT: Route = { view: 'codex', entryId: null }
export const DECKS_ROOT: Route = { view: 'decks', deckId: null }

export function parseHash(hash: string): Route {
  const entry = hash.match(/^#\/e\/([^/?#]+)/)
  if (entry) return { view: 'codex', entryId: decodeURIComponent(entry[1]) }
  const deck = hash.match(/^#\/decks(?:\/(\d+))?(?:[/?#]|$)/)
  if (deck) return { view: 'decks', deckId: deck[1] ? Number(deck[1]) : null }
  return CODEX_ROOT
}

export function hashFor(route: Route): string {
  if (route.view === 'decks') return route.deckId === null ? '#/decks' : `#/decks/${route.deckId}`
  return route.entryId === null ? '#/' : `#/e/${encodeURIComponent(route.entryId)}`
}

export function entryHash(id: string): string {
  return hashFor({ view: 'codex', entryId: id })
}

/** How many in-app navigations led to the current history entry; 0 means back leaves the app. */
function depth(): number {
  const state: unknown = window.history.state
  return state && typeof state === 'object' && 'depth' in state && typeof state.depth === 'number'
    ? state.depth
    : 0
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  // State is set directly as well as through the hash, so the view changes in the same
  // frame as the tap instead of waiting for the browser's hashchange event. Each navigation
  // records how deep into the app it is, so Back can tell a real history entry from a cold
  // start on a deep link.
  const navigate = (next: Route) => {
    setRoute(next)
    const hash = hashFor(next)
    if (window.location.hash === hash || (hash === '#/' && window.location.hash === '')) return
    const before = depth()
    window.location.hash = hash
    window.history.replaceState({ depth: before + 1 }, '')
  }

  const back = (fallback: Route) => {
    if (depth() > 0) window.history.back()
    else navigate(fallback)
  }

  return { route, navigate, back }
}
