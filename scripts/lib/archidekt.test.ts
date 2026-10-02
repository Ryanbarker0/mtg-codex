import { describe, expect, it } from 'vitest'
import { folderFromHtml, includedCards, type ArchidektDeck } from './archidekt.ts'

const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: {
    pageProps: {
      redux: {
        folders: {
          rootFolder: {
            id: 1553499,
            name: 'Owned',
            owner: { username: 'barksie' },
            decks: [
              {
                id: 1,
                name: 'Ninjas',
                updatedAt: '2026-09-30T08:50:33Z',
                featured: 'https://x/art.webp',
              },
              { id: 2, name: 'Dinos', updatedAt: '2026-09-03T18:01:40Z' },
            ],
            next: null,
          },
        },
      },
    },
  },
})}</script></body></html>`

describe('folderFromHtml', () => {
  it('reads the folder and its decks from the embedded state', () => {
    const folder = folderFromHtml(html)
    expect(folder).toMatchObject({ id: 1553499, name: 'Owned', owner: 'barksie', next: null })
    expect(folder.decks.map((d) => d.name)).toEqual(['Ninjas', 'Dinos'])
    expect(folder.decks[0].featured).toBe('https://x/art.webp')
  })

  it('fails loudly when the page has no state', () => {
    expect(() => folderFromHtml('<html></html>')).toThrow(/no embedded state/)
  })
})

describe('includedCards', () => {
  const deck: ArchidektDeck = {
    id: 1,
    name: 'Ninjas',
    updatedAt: '',
    categories: [
      { name: 'Commander', includedInDeck: true, isPremier: true },
      { name: 'Creature', includedInDeck: true, isPremier: false },
      { name: 'Maybeboard', includedInDeck: false, isPremier: false },
    ],
    cards: [
      {
        quantity: 1,
        categories: ['Commander'],
        card: { uid: 'a', oracleCard: { name: 'Yuriko' } },
      },
      { quantity: 1, categories: ['Creature'], card: { uid: 'b', oracleCard: { name: 'Ninja' } } },
      {
        quantity: 1,
        categories: ['Maybeboard'],
        card: { uid: 'c', oracleCard: { name: 'Maybe' } },
      },
      {
        quantity: 1,
        categories: ['Maybeboard', 'Creature'],
        card: { uid: 'd', oracleCard: { name: 'Both' } },
      },
      { quantity: 9, categories: null, card: { uid: 'e', oracleCard: { name: 'Island' } } },
    ],
  }

  it('drops cards that are only in excluded categories and marks commanders', () => {
    const cards = includedCards(deck)
    expect(cards.map((c) => c.name)).toEqual(['Yuriko', 'Ninja', 'Both', 'Island'])
    expect(cards[0].isCommander).toBe(true)
    expect(cards[1].isCommander).toBe(false)
    expect(cards[3].quantity).toBe(9)
  })
})
