import { describe, expect, it } from 'vitest'
import { buildImportedDeck, defaultDeckName } from './importDeck'

const entries = new Map([
  ['flying', 'flying'],
  ['ninjutsu', 'ninjutsu'],
])

describe('buildImportedDeck', () => {
  it('names the deck after its commander, counts cards and groups keywords', () => {
    const deck = buildImportedDeck(
      '',
      [
        {
          name: "Yuriko, the Tiger's Shadow",
          scryfallId: '1',
          typeLine: 'Legendary Creature',
          keywords: ['Commander ninjutsu'],
          artCrop: 'https://cards/yuriko.jpg',
          quantity: 1,
          isCommander: true,
        },
        {
          name: 'Ornithopter',
          scryfallId: '2',
          typeLine: 'Artifact Creature',
          keywords: ['Flying'],
          quantity: 1,
          isCommander: false,
        },
        {
          name: 'Island',
          scryfallId: '3',
          typeLine: 'Basic Land',
          keywords: [],
          quantity: 30,
          isCommander: false,
        },
      ],
      [{ quantity: 1, name: 'Nope', isCommander: false, raw: '1 Nope' }],
      entries,
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
    expect(deck.id).toMatch(/^imported-/)
  })

  it('keeps a typed name', () => {
    const deck = buildImportedDeck('Ninjas', [], [], entries)
    expect(deck.name).toBe('Ninjas')
    expect(deck.unresolved).toBeUndefined()
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
