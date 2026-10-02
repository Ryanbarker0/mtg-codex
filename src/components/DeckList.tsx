import type { Deck } from '../lib/decks'

interface Props {
  decks: Deck[]
  selectedId: number | null
  onOpen: (id: number) => void
}

/** One tile per deck, with its featured art. */
export function DeckList({ decks, selectedId, onOpen }: Props) {
  if (decks.length === 0) return <div className="empty">No decks in the folder.</div>
  return (
    <ul className="deck-list">
      {decks.map((deck) => (
        <li key={deck.id}>
          <button
            className={`deck-tile${deck.id === selectedId ? ' selected' : ''}`}
            aria-current={deck.id === selectedId ? 'page' : undefined}
            onClick={() => onOpen(deck.id)}
          >
            {deck.art && <img className="deck-art" src={deck.art} alt="" loading="lazy" />}
            <span className="deck-tile-body">
              <strong>{deck.name}</strong>
              <span className="muted">{deck.commanders.join(' / ')}</span>
              <span className="faint small">
                {deck.cardCount} cards · {deck.keywords.length} mechanics
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
