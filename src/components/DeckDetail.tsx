import type { Entry, EntryKind } from '../lib/codex'
import { entriesById } from '../lib/codexData'
import type { Deck, DeckKeyword } from '../lib/decks'
import { KIND_LABEL } from '../lib/search'
import { snippet } from '../lib/snippet'
import { SourceTag } from './SourceTag'

interface Props {
  deck: Deck
  onOpenEntry: (id: string) => void
  onBack: () => void
}

const KIND_ORDER: EntryKind[] = ['keyword-ability', 'keyword-action', 'ability-word', 'term']

interface Row {
  entry: Entry
  keyword: DeckKeyword
}

/** Every mechanic in a deck, grouped by kind, with the cards that carry it. */
export function DeckDetail({ deck, onOpenEntry, onBack }: Props) {
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

  const updated = new Date(deck.updatedAt)

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
          <p className="muted">{deck.commanders.join(' / ')}</p>
          <p className="faint small">
            {deck.cardCount} cards · updated{' '}
            {updated.toLocaleDateString(undefined, { dateStyle: 'medium' })} ·{' '}
            <a href={deck.url} target="_blank" rel="noreferrer">
              Archidekt ↗
            </a>
          </p>
        </div>
      </header>

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
    </article>
  )
}
