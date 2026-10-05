import { describe, expect, it } from 'vitest'
import { buildImportedDeck, defaultDeckName, refreshDeck } from './importDeck'

const entries = new Map([
  ['flying', 'flying'],
  ['ninjutsu', 'ninjutsu'],
])

describe('buildImportedDeck', () => {
  it('names the deck after its commander, counts cards and groups keywords', () => {
    const deck = buildImportedDeck(
      '',
      '1 Yuriko\n1 Ornithopter\n30 Island\n1 Nope',
      [
        {
          name: "Yuriko, the Tiger's Shadow",
          scryfallId: '1',
          typeLine: 'Legendary Creature',
          keywords: ['Commander ninjutsu'],
          text: '',
          artCrop: 'https://cards/yuriko.jpg',
          quantity: 1,
          isCommander: true,
        },
        {
          name: 'Ornithopter',
          scryfallId: '2',
          typeLine: 'Artifact Creature',
          keywords: ['Flying'],
          text: 'Flying',
          quantity: 1,
          isCommander: false,
        },
        {
          name: 'Island',
          scryfallId: '3',
          typeLine: 'Basic Land',
          keywords: [],
          text: '',
          quantity: 30,
          isCommander: false,
        },
      ],
      [{ quantity: 1, name: 'Nope', isCommander: false, raw: '1 Nope' }],
      entries,
      [],
      new Date('2026-10-02T10:00:00Z'),
    )
    expect(deck.name).toBe('Yuriko')
    expect(deck.importedAt).toBe('2026-10-02T10:00:00.000Z')
    expect(deck.commanders).toEqual(["Yuriko, the Tiger's Shadow"])
    expect(deck.art).toBe('https://cards/yuriko.jpg')
    expect(deck.cardCount).toBe(32)
    expect(deck.keywords).toEqual([
      { entryId: 'flying', keyword: 'Flying', cards: ['Ornithopter'] },
    ])
    expect(deck.unresolved).toEqual(['1 Nope'])
    expect(deck.list).toBe('1 Yuriko\n1 Ornithopter\n30 Island\n1 Nope')
    expect(deck.id).toMatch(/^imported-/)
  })

  it('keeps a typed name', () => {
    const deck = buildImportedDeck('Ninjas', '', [], [], entries)
    expect(deck.name).toBe('Ninjas')
    expect(deck.unresolved).toBeUndefined()
  })
})

describe('refreshDeck', () => {
  it('keeps identity and replaces what Scryfall resolved', () => {
    const original = buildImportedDeck(
      'Ninjas',
      '1 Nope',
      [],
      [{ quantity: 1, name: 'Nope', isCommander: false, raw: '1 Nope' }],
      entries,
    )
    const refreshed = refreshDeck(
      original,
      [
        {
          name: 'Ornithopter',
          scryfallId: '2',
          typeLine: 'Artifact Creature',
          keywords: ['Flying'],
          text: '',
          quantity: 1,
          isCommander: false,
        },
      ],
      [],
      entries,
    )
    expect(refreshed.id).toBe(original.id)
    expect(refreshed.name).toBe('Ninjas')
    expect(refreshed.importedAt).toBe(original.importedAt)
    expect(refreshed.cardCount).toBe(1)
    expect(refreshed.keywords.map((k) => k.keyword)).toEqual(['Flying'])
    expect(refreshed.unresolved).toBeUndefined()
  })
})

describe('defaultDeckName', () => {
  it('shortens and joins commander names', () => {
    expect(defaultDeckName([{ name: 'The Second Doctor' }, { name: 'Clara Oswald' }])).toBe(
      'The Second Doctor & Clara Oswald',
    )
    expect(defaultDeckName([])).toBe('Imported deck')
  })
})
