import { describe, expect, it } from 'vitest'
import { deckKeywords, withoutReminderText } from './decks'

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

  it('finds keyword abilities a card grants or names in its text, ignoring reminder text', () => {
    const textKeywords = [
      { name: 'Cascade', entryId: 'cascade' },
      { name: 'Flying', entryId: 'flying' },
      { name: 'Flash', entryId: 'flash' },
    ]
    const result = deckKeywords(
      [
        {
          name: 'Zhulodok, Void Gorger',
          keywords: [],
          text: 'Colorless spells you cast from your hand with mana value 7 or greater have "Cascade, cascade." (When you cast one, exile cards from the top of your library.)',
        },
        {
          name: 'Ornithopter',
          keywords: ['Flying'],
          text: "Flying (This creature can't be blocked except by creatures with flying or reach.)",
        },
        { name: 'Plummet', keywords: [], text: 'Destroy target creature with flying.' },
        {
          name: 'Deep Analysis',
          keywords: ['Flashback'],
          text: 'Draw two cards.\nFlashback—Pay 3 life.',
        },
      ],
      new Map([
        ['cascade', 'cascade'],
        ['flying', 'flying'],
        ['flash', 'flash'],
        ['flashback', 'flashback'],
      ]),
      new Set(),
      textKeywords,
    )
    expect(result).toEqual([
      { entryId: 'cascade', keyword: 'Cascade', cards: [], mentionedBy: ['Zhulodok, Void Gorger'] },
      { entryId: 'flashback', keyword: 'Flashback', cards: ['Deep Analysis'] },
      { entryId: 'flying', keyword: 'Flying', cards: ['Ornithopter'], mentionedBy: ['Plummet'] },
    ])
  })
})

describe('withoutReminderText', () => {
  it('drops parenthesised reminder text', () => {
    expect(withoutReminderText("Flying (This creature can't be blocked.) Vigilance")).toBe(
      'Flying   Vigilance',
    )
  })
})
