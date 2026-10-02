import { describe, expect, it } from 'vitest'
import { deckKeywords } from './decks'

describe('deckKeywords', () => {
  const entries = new Map([
    ['flying', 'flying'],
    ['ninjutsu', 'ninjutsu'],
  ])

  it('groups cards by keyword, maps to entries and reports unknown names', () => {
    const unknown = new Set<string>()
    const result = deckKeywords(
      [
        { name: 'Ornithopter', keywords: ['Flying'] },
        { name: 'Ninja of the Deep Hours', keywords: ['Ninjutsu'] },
        { name: 'Thousand-Faced Shadow', keywords: ['Flying', 'Ninjutsu'] },
        { name: 'Thousand-Faced Shadow', keywords: ['Flying'] },
        { name: 'Blitzball Star', keywords: ['Blitzball Captain'] },
      ],
      entries,
      unknown,
    )
    expect(result).toEqual([
      { entryId: 'flying', keyword: 'Flying', cards: ['Ornithopter', 'Thousand-Faced Shadow'] },
      {
        entryId: 'ninjutsu',
        keyword: 'Ninjutsu',
        cards: ['Ninja of the Deep Hours', 'Thousand-Faced Shadow'],
      },
    ])
    expect([...unknown]).toEqual(['Blitzball Captain'])
  })
})
