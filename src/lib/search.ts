import type { Entry, EntryKind } from './codex'
import { normaliseText } from './text'

/**
 * Ranks codex entries for a query. Name matches come first, in order of how much of the
 * name they cover, then matches inside the reminder text, glossary and summary. Every
 * word of the query has to match somewhere for an entry to appear at all.
 */

export type KindFilter = 'all' | 'keywords' | EntryKind

export const KIND_LABEL: Record<EntryKind, string> = {
  'keyword-ability': 'Keyword ability',
  'keyword-action': 'Keyword action',
  'ability-word': 'Ability word',
  term: 'Rules term',
}

const KIND_ORDER: Record<EntryKind, number> = {
  'keyword-ability': 0,
  'keyword-action': 1,
  'ability-word': 2,
  term: 3,
}

export function matchesFilter(entry: Entry, filter: KindFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'keywords') return entry.kind !== 'term'
  return entry.kind === filter
}

interface Indexed {
  entry: Entry
  name: string
  words: string[]
  body: string
}

export function indexEntries(entries: Entry[]): Indexed[] {
  return entries.map((entry) => {
    const name = normaliseText(entry.name)
    return {
      entry,
      name,
      words: name.split(/[\s-]+/),
      body: normaliseText(
        [entry.wiki?.reminder, entry.glossary, entry.wiki?.summary].filter(Boolean).join(' '),
      ),
    }
  })
}

function score(item: Indexed, query: string, tokens: string[]): number {
  if (item.name === query) return 100
  if (item.name.startsWith(query)) return 80
  if (item.words.some((w) => w.startsWith(query))) return 70
  if (item.name.includes(query)) return 60
  if (tokens.every((t) => item.words.some((w) => w.startsWith(t)))) return 50
  if (tokens.every((t) => item.body.includes(t))) return 20
  return 0
}

export function search(index: Indexed[], rawQuery: string, filter: KindFilter): Entry[] {
  const query = normaliseText(rawQuery)
  const candidates = index.filter((i) => matchesFilter(i.entry, filter))
  if (query === '') {
    return candidates.map((i) => i.entry).sort((a, b) => a.name.localeCompare(b.name))
  }
  const tokens = query.split(' ')
  return candidates
    .map((item) => ({ item, score: score(item, query, tokens) }))
    .filter((s) => s.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        KIND_ORDER[a.item.entry.kind] - KIND_ORDER[b.item.entry.kind] ||
        a.item.name.length - b.item.name.length ||
        a.item.name.localeCompare(b.item.name),
    )
    .map((s) => s.item.entry)
}
