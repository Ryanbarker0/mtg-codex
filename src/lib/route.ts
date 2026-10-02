import { useEffect, useState } from 'react'

/**
 * Hash routing, so an entry has a shareable address and the browser's back gesture closes
 * it. "#/" is the list; "#/e/<id>" is an entry.
 */

export function entryIdFromHash(hash: string): string | null {
  const match = hash.match(/^#\/e\/([^/?#]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function hashForEntry(id: string): string {
  return `#/e/${encodeURIComponent(id)}`
}

export function useHashRoute() {
  const [entryId, setEntryId] = useState(() => entryIdFromHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setEntryId(entryIdFromHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  // State is set directly as well as through the hash, so the view changes in the same
  // frame as the tap instead of waiting for the browser's hashchange event.
  const open = (id: string) => {
    setEntryId(id)
    if (entryIdFromHash(window.location.hash) !== id) window.location.hash = hashForEntry(id)
  }
  const close = () => {
    setEntryId(null)
    if (entryIdFromHash(window.location.hash) !== null) window.location.hash = '#/'
  }

  return { entryId, open, close }
}
