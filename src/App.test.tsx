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
