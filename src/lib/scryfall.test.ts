import { describe, expect, it } from 'vitest'
import { searchQuery, toExampleCard } from './scryfall'

describe('scryfall', () => {
  it('quotes the keyword and limits to paper, non-silly cards', () => {
    expect(searchQuery('Commander ninjutsu')).toBe(
      'keyword:"Commander ninjutsu" game:paper -is:funny',
    )
  })

  it('takes a double-faced card’s front image', () => {
    const card = toExampleCard({
      id: '1',
      name: 'Front // Back',
      type_line: 'Creature // Creature',
      scryfall_uri: 'https://scryfall.com/card/x',
      card_faces: [{ image_uris: { small: 's', normal: 'n' } }, { image_uris: { small: 'bs' } }],
    })
    expect(card.imageSmall).toBe('s')
    expect(card.imageNormal).toBe('n')
  })
})

describe('matchCollectionCard', () => {
  const cards = [
    {
      id: 'a',
      name: 'Sol Ring',
      type_line: 'Artifact',
      scryfall_uri: '',
      set: 'cmm',
      collector_number: '464',
    },
    {
      id: 'b',
      name: 'Counterspell',
      type_line: 'Instant',
      scryfall_uri: '',
      set: 'mh2',
      collector_number: '267',
    },
    {
      id: 'c',
      name: 'Valakut Awakening // Valakut Stoneforge',
      type_line: 'Instant // Land',
      scryfall_uri: '',
      set: 'znr',
      collector_number: '174',
      card_faces: [{ name: 'Valakut Awakening' }, { name: 'Valakut Stoneforge' }],
    },
  ]
  const line = (name: string, set?: string, collectorNumber?: string) => ({
    quantity: 1,
    name,
    set,
    collectorNumber,
    isCommander: false,
    raw: name,
  })

  it('matches by printing only when the name agrees', async () => {
    const { matchCollectionCard } = await import('./scryfall')
    expect(matchCollectionCard(line('Sol Ring', 'cmm', '464'), cards, true)?.id).toBe('a')
    expect(matchCollectionCard(line('Lightning Bolt', 'cmm', '464'), cards, true)).toBeUndefined()
  })

  it('matches by name, including a single face of a double-faced card', async () => {
    const { matchCollectionCard } = await import('./scryfall')
    expect(matchCollectionCard(line('counterspell'), cards, false)?.id).toBe('b')
    expect(matchCollectionCard(line('Valakut Awakening'), cards, false)?.id).toBe('c')
  })
})
