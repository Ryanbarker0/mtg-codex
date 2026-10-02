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
