/**
 * The last few entries opened, kept in localStorage so a mechanic looked up earlier in the
 * game is one tap away. This is a convenience only: if storage is unavailable the app works
 * without it.
 */

const KEY = 'mtg-codex:recent'
export const RECENT_LIMIT = 10

export function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function pushRecent(id: string, current: string[] = loadRecent()): string[] {
  const next = [id, ...current.filter((x) => x !== id)].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or blocked storage: the list just will not persist.
  }
  return next
}
