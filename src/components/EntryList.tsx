import type { Entry } from '../lib/codex'
import { snippet } from '../lib/snippet'
import { KindBadge } from './KindBadge'

interface Props {
  entries: Entry[]
  selectedId: string | null
  onOpen: (id: string) => void
  emptyMessage: string
}

/** One line per entry: the name and a single line of what it does. */
export function EntryList({ entries, selectedId, onOpen, emptyMessage }: Props) {
  if (entries.length === 0) return <div className="empty">{emptyMessage}</div>
  return (
    <ul className="entry-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            className={`entry-row${entry.id === selectedId ? ' selected' : ''}`}
            aria-current={entry.id === selectedId ? 'page' : undefined}
            onClick={() => onOpen(entry.id)}
          >
            <span className="entry-row-head">
              <strong>{entry.name}</strong>
              <KindBadge kind={entry.kind} />
            </span>
            <span className="entry-row-snippet">{snippet(entry)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
