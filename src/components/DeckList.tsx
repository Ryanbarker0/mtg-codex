import type { Deck } from '../lib/decks'

interface Props {
  userDecks: Deck[]
  builtInDecks: Deck[]
  builtInLabel: string
  showBuiltIn: boolean
  onToggleBuiltIn: () => void
  selectedId: string | null
  onOpen: (id: string) => void
  onImport: () => void
}

/** Decks imported on this device first, then the built-in presets, which can be hidden. */
export function DeckList({
  userDecks,
  builtInDecks,
  builtInLabel,
  showBuiltIn,
  onToggleBuiltIn,
  selectedId,
  onOpen,
  onImport,
}: Props) {
  return (
    <div className="stackable" style={{ gap: 18 }}>
      <section className="deck-section">
        <div className="block-head">
          <h3>Your decks</h3>
          <button className="chip" onClick={onImport}>
            + Add deck
          </button>
        </div>
        {userDecks.length === 0 ? (
          <div className="empty">
            Paste a decklist from Archidekt or Moxfield to see every mechanic in it. Decks stay on
            this device.
          </div>
        ) : (
          <Tiles decks={userDecks} selectedId={selectedId} onOpen={onOpen} />
        )}
      </section>

      {builtInDecks.length > 0 && (
        <section className="deck-section">
          <div className="block-head">
            <h3>{builtInLabel}</h3>
            <button className="chip" onClick={onToggleBuiltIn}>
              {showBuiltIn ? 'Hide' : `Show ${builtInDecks.length}`}
            </button>
          </div>
          {showBuiltIn && <Tiles decks={builtInDecks} selectedId={selectedId} onOpen={onOpen} />}
        </section>
      )}
    </div>
  )
}

function Tiles({
  decks,
  selectedId,
  onOpen,
}: {
  decks: Deck[]
  selectedId: string | null
  onOpen: (id: string) => void
}) {
  return (
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
  )
}
