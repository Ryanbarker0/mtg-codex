import type { Deck } from '../lib/decks'

interface Props {
  decks: Deck[]
  selectedId: string | null
  onOpen: (id: string) => void
  onImport: () => void
}

/** The decks imported on this device, one tile each. */
export function DeckList({ decks, selectedId, onOpen, onImport }: Props) {
  return (
    <section className="deck-section">
      <div className="block-head">
        <h3>Your decks</h3>
        <button className="chip" onClick={onImport}>
          + Add deck
        </button>
      </div>
      {decks.length === 0 ? (
        <div className="empty">
          Paste a decklist from Archidekt or Moxfield to see every mechanic in it. Decks stay on
          this device.
        </div>
      ) : (
        <ul className="deck-list">
          {decks.map((deck) => (
            <li key={deck.id}>
              <button
                className={`deck-tile${deck.id === selectedId ? ' selected' : ''}`}
                aria-current={deck.id === selectedId ? 'page' : undefined}
                onClick={() => onOpen(deck.id)}
              >
                {deck.art ? (
                  <img className="deck-art" src={deck.art} alt="" loading="lazy" />
                ) : (
                  <span className="deck-art" />
                )}
                <span className="deck-tile-body">
                  <strong>{deck.name}</strong>
                  {deck.commanders.length > 0 && (
                    <span className="muted">{deck.commanders.join(' / ')}</span>
                  )}
                  <span className="faint small">
                    {deck.cardCount} cards · {deck.keywords.length} mechanics
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
