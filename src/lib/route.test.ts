import { describe, expect, it } from 'vitest'
import { entryHash, hashFor, parseHash } from './route'

describe('route', () => {
  it('round-trips entries and decks through the hash', () => {
    expect(parseHash(entryHash('council-s-dilemma'))).toEqual({
      view: 'codex',
      entryId: 'council-s-dilemma',
    })
    expect(parseHash(hashFor({ view: 'decks', deckId: '26703455' }))).toEqual({
      view: 'decks',
      deckId: '26703455',
    })
    expect(parseHash(hashFor({ view: 'decks', deckId: 'imported-abc-def' }))).toEqual({
      view: 'decks',
      deckId: 'imported-abc-def',
    })
    expect(parseHash('#/decks')).toEqual({ view: 'decks', deckId: null })
    expect(parseHash('#/decks/')).toEqual({ view: 'decks', deckId: null })
    expect(parseHash('#/decks/import')).toEqual({ view: 'decks', deckId: null, importing: true })
    expect(parseHash('#/stack')).toEqual({ view: 'stack' })
    expect(hashFor({ view: 'stack' })).toBe('#/stack')
    expect(hashFor({ view: 'decks', deckId: null, importing: true })).toBe('#/decks/import')
  })

  it('falls back to the codex root', () => {
    expect(parseHash('#/')).toEqual({ view: 'codex', entryId: null })
    expect(parseHash('')).toEqual({ view: 'codex', entryId: null })
    expect(parseHash('#/nonsense')).toEqual({ view: 'codex', entryId: null })
    expect(parseHash('#/e/evoke?x=1')).toEqual({ view: 'codex', entryId: 'evoke' })
  })
})
