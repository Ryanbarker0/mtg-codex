import { describe, expect, it } from 'vitest'
import type { Entry } from './codex'
import { indexEntries, matchesFilter, search } from './search'

const entry = (name: string, kind: Entry['kind'], extra: Partial<Entry> = {}): Entry => ({
  id: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  kind,
  ruleNumbers: [],
  related: [],
  ...extra,
})

const entries: Entry[] = [
  entry('Evoke', 'keyword-ability', {
    wiki: { title: 'Evoke', url: '', reminder: 'You may cast this spell for its evoke cost.' },
  }),
  entry('Evolve', 'keyword-ability'),
  entry('Commander ninjutsu', 'keyword-ability'),
  entry('Ninjutsu', 'keyword-ability'),
  entry('Council’s dilemma', 'ability-word'),
  entry('Sacrifice', 'keyword-action', {
    glossary: 'To move a permanent you control to its owner’s graveyard.',
  }),
  entry('Monarch', 'term', { glossary: 'A designation a player can have.' }),
  entry('Evoke cost thing', 'term', { glossary: 'Mentions evoke.' }),
]
const index = indexEntries(entries)

describe('search', () => {
  it('lists everything alphabetically when the query is empty', () => {
    expect(search(index, '', 'all').map((e) => e.name)).toEqual([
      'Commander ninjutsu',
      'Council’s dilemma',
      'Evoke',
      'Evoke cost thing',
      'Evolve',
      'Monarch',
      'Ninjutsu',
      'Sacrifice',
    ])
  })

  it('puts the exact name first, then prefixes, then body matches', () => {
    expect(search(index, 'evoke', 'all').map((e) => e.name)).toEqual(['Evoke', 'Evoke cost thing'])
    expect(search(index, 'evo', 'all').map((e) => e.name)).toEqual([
      'Evoke',
      'Evolve',
      'Evoke cost thing',
    ])
  })

  it('matches a later word of the name', () => {
    expect(search(index, 'ninj', 'all').map((e) => e.name)).toEqual([
      'Ninjutsu',
      'Commander ninjutsu',
    ])
  })

  it('ignores accents, curly quotes and case', () => {
    expect(search(index, "council's", 'all')[0].name).toBe('Council’s dilemma')
    expect(search(index, 'MONARCH', 'all')[0].name).toBe('Monarch')
  })

  it('requires every word to match', () => {
    expect(search(index, 'commander ninjutsu', 'all').map((e) => e.name)).toEqual([
      'Commander ninjutsu',
    ])
    expect(search(index, 'commander evoke', 'all')).toEqual([])
  })

  it('searches glossary text', () => {
    expect(search(index, 'graveyard', 'all').map((e) => e.name)).toEqual(['Sacrifice'])
  })

  it('applies the kind filter', () => {
    expect(search(index, '', 'keywords').every((e) => e.kind !== 'term')).toBe(true)
    expect(search(index, 'evo', 'term').map((e) => e.name)).toEqual(['Evoke cost thing'])
    expect(matchesFilter(entries[0], 'keyword-ability')).toBe(true)
    expect(matchesFilter(entries[0], 'keyword-action')).toBe(false)
  })
})
