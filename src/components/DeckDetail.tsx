import { useEffect, useState } from 'react'
import type { Entry, EntryKind } from '../lib/codex'
import { entriesById } from '../lib/codexData'
import type { Deck, DeckKeyword } from '../lib/decks'
import { KIND_LABEL } from '../lib/search'
import { snippet } from '../lib/snippet'
import { SourceTag } from './SourceTag'

interface Props {
  deck: Deck
  onOpenEntry: (id: string) => void
  onRemove: () => void
  onBack: () => void
}

const KIND_ORDER: EntryKind[] = ['keyword-ability', 'keyword-action', 'ability-word', 'term']

interface Row {
  entry: Entry
  keyword: DeckKeyword
}

/** Every mechanic in a deck, grouped by kind, with the cards that carry it. */
export function DeckDetail({ deck, onOpenEntry, onRemove, onBack }: Props) {
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!confirming) return
    const timer = window.setTimeout(() => setConfirming(false), 4000)
    return () => window.clearTimeout(timer)
  }, [confirming])

  const rows: Row[] = deck.keywords.flatMap((keyword) => {
    const entry = entriesById.get(keyword.entryId)
    return entry ? [{ entry, keyword }] : []
  })
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    rows: rows
      .filter((r) => r.entry.kind === kind)
      .sort(
        (a, b) =>
          b.keyword.cards.length - a.keyword.cards.length ||
          a.entry.name.localeCompare(b.entry.name),
      ),
  })).filter((g) => g.rows.length > 0)

  const imported = new Date(deck.importedAt)

  return (
    <article className="detail" key={deck.id}>
      <div className="detail-top">
        <button className="ghost back" onClick={onBack} aria-label="Back to the deck list">
          ‹ Decks
        </button>
      </div>
      <header className="deck-head">
        {deck.art && <img className="deck-banner" src={deck.art} alt="" />}
        <div className="deck-head-text">
          <h1>{deck.name}</h1>
          {deck.commanders.length > 0 && <p className="muted">{deck.commanders.join(' / ')}</p>}
          <p className="faint small">
            {deck.cardCount} cards · imported{' '}
            {imported.toLocaleDateString(undefined, { dateStyle: 'medium' })} on this device
          </p>
        </div>
      </header>

      {deck.unresolved && deck.unresolved.length > 0 && (
        <div className="notice">
          <strong>
            {deck.unresolved.length} {deck.unresolved.length === 1 ? 'line was' : 'lines were'} not
            found on Scryfall and left out
          </strong>
          <ul className="unresolved">
            {deck.unresolved.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {groups.length === 0 && <div className="empty">No mechanics found in this deck.</div>}

      {groups.map((group) => (
        <section key={group.kind} className="block">
          <div className="block-head">
            <h3>
              {KIND_LABEL[group.kind]}
              {group.rows.length > 1 ? ` · ${group.rows.length}` : ''}
            </h3>
            {group === groups[0] && <SourceTag>Scryfall card data</SourceTag>}
          </div>
          <ul className="entry-list">
            {group.rows.map(({ entry, keyword }) => (
              <li key={entry.id}>
                <button className="entry-row" onClick={() => onOpenEntry(entry.id)}>
                  <span className="entry-row-head">
                    <strong>{entry.name}</strong>
                    <span className="count">
                      {keyword.cards.length} {keyword.cards.length === 1 ? 'card' : 'cards'}
                    </span>
                  </span>
                  <span className="entry-row-snippet">{snippet(entry)}</span>
                  <span className="entry-row-cards">{keyword.cards.join(', ')}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="row">
        <button
          className={confirming ? 'danger' : 'ghost'}
          onClick={() => {
            if (confirming) onRemove()
            else setConfirming(true)
          }}
        >
          {confirming ? 'Tap again to remove this deck' : 'Remove deck from this device'}
        </button>
      </div>
    </article>
  )
}
