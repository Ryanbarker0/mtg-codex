import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

/** Scryfall is not reached in tests; every search comes back empty. */
const emptySearch = () =>
  Promise.resolve(
    new Response(JSON.stringify({ total_cards: 0, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

describe('App', () => {
  beforeEach(() => {
    window.location.hash = ''
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(emptySearch))
    Element.prototype.scrollTo = vi.fn()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('finds a keyword and shows its sources', async () => {
    render(<App />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'evoke' } })
    const list = screen.getByRole('list')
    fireEvent.click(within(list).getByRole('button', { name: /^Evoke/ }))

    const entry = screen.getByRole('region', { name: 'Entry' })
    expect(within(entry).getByRole('heading', { level: 1, name: 'Evoke' })).toBeInTheDocument()
    expect(within(entry).getByText('Reminder text')).toBeInTheDocument()
    expect(within(entry).getByText(/^702\.74\.$/)).toBeInTheDocument()
    expect(within(entry).getByText(/Evoke represents two abilities/)).toBeInTheDocument()
    expect(window.location.hash).toBe('#/e/evoke')
    expect(await within(entry).findByText(/0 on Scryfall/)).toBeInTheDocument()
  })

  it('opens an entry from the address and remembers it as recent', () => {
    window.location.hash = '#/e/monarch'
    render(<App />)
    const entry = screen.getByRole('region', { name: 'Entry' })
    expect(within(entry).getByRole('heading', { level: 1, name: 'Monarch' })).toBeInTheDocument()
    expect(within(entry).getByText(/^725\.$/)).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Search' })).getByRole('button', {
        name: 'Monarch',
      }),
    ).toBeInTheDocument()
  })

  it('links a rule reference to the entry that defines it', () => {
    window.location.hash = '#/e/commander-ninjutsu'
    render(<App />)
    const entry = screen.getByRole('region', { name: 'Entry' })
    // The glossary line says "See rule 702.49, “Ninjutsu.”" and that section belongs to Ninjutsu.
    fireEvent.click(within(entry).getByRole('button', { name: '702.49' }))
    expect(window.location.hash).toBe('#/e/ninjutsu')
  })

  it('says when nothing matches', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzzzz' } })
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument()
  })
})

describe('Deck import', () => {
  /** A Scryfall collection answer for whatever names were asked for. */
  const collection = (names: string[]) =>
    new Response(
      JSON.stringify({
        data: names.map((name, i) => ({
          id: `id-${i}`,
          name,
          type_line: 'Creature',
          scryfall_uri: '',
          set: 'xxx',
          collector_number: String(i),
          keywords:
            name === 'Ornithopter'
              ? ['Flying']
              : name === 'Ninja of the Deep Hours'
                ? ['Ninjutsu']
                : [],
          image_uris: { art_crop: `https://cards/${i}.jpg` },
        })),
        not_found: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )

  beforeEach(() => {
    window.location.hash = '#/decks/import'
    localStorage.clear()
    indexedDB.deleteDatabase('mtg-codex')
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (String(url).includes('/cards/collection')) {
          const body = JSON.parse(String(init?.body)) as { identifiers: Array<{ name: string }> }
          return Promise.resolve(collection(body.identifiers.map((i) => i.name)))
        }
        return emptySearch()
      }),
    )
    Element.prototype.scrollTo = vi.fn()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('pastes a list, looks it up and saves the deck on the device', async () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Decklist' }), {
      target: {
        value:
          'Commander\n1 Yuriko, the Tiger\u2019s Shadow\n\nDeck\n1 Ornithopter\n1 Ninja of the Deep Hours\n30 Island',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /Look up 4 cards/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save deck' }))

    const deckPane = screen.getByRole('region', { name: 'Deck' })
    expect(within(deckPane).getByRole('heading', { level: 1, name: 'Yuriko' })).toBeInTheDocument()
    expect(within(deckPane).getByText('Flying')).toBeInTheDocument()
    expect(within(deckPane).getByText('Ninjutsu')).toBeInTheDocument()
    expect(within(deckPane).getByText(/33 cards/)).toBeInTheDocument()
    expect(within(deckPane).getByRole('button', { name: /Remove deck/ })).toBeInTheDocument()
    expect(window.location.hash).toMatch(/^#\/decks\/imported-/)

    // The deck is listed, and the mechanic's entry knows about it.
    fireEvent.click(within(deckPane).getByRole('button', { name: /^Back to the deck list/ }))
    const list = screen.getByRole('region', { name: 'Decks' })
    expect(within(list).getByRole('button', { name: /^Yuriko/ })).toBeInTheDocument()
    fireEvent.click(within(list).getByRole('button', { name: /^Yuriko/ }))
    fireEvent.click(within(screen.getByRole('region', { name: 'Deck' })).getByText('Flying'))
    const entry = screen.getByRole('region', { name: 'Entry' })
    expect(within(entry).getByText('In your decks')).toBeInTheDocument()
    expect(within(entry).getByRole('button', { name: /^Yuriko/ })).toBeInTheDocument()
  })

  it('starts with no decks', () => {
    window.location.hash = '#/decks'
    render(<App />)
    const list = screen.getByRole('region', { name: 'Decks' })
    expect(within(list).getByText(/Paste a decklist/)).toBeInTheDocument()
    expect(within(list).queryAllByRole('button', { name: /cards ·/ })).toHaveLength(0)
  })
})
