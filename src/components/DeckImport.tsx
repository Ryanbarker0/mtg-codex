import { useState } from 'react'
import { parseDecklist } from '../lib/decklist'
import type { Deck } from '../lib/decks'
import { entryIdByKeyword, textKeywords } from '../lib/decksData'
import { buildImportedDeck } from '../lib/importDeck'
import { lookupDecklist } from '../lib/scryfall'

interface Props {
  onSave: (deck: Deck) => void
  onCancel: () => void
}

type Phase =
  | { kind: 'edit' }
  | { kind: 'looking'; done: number; total: number }
  | { kind: 'ready'; deck: Deck }
  | { kind: 'error'; message: string }

/**
 * Paste a decklist, resolve it on Scryfall, review what was found, and save it on the
 * device. Archidekt and Moxfield block browser requests, so the text export is the way in.
 */
export function DeckImport({ onSave, onCancel }: Props) {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'edit' })

  const lines = parseDecklist(text)

  const lookUp = async () => {
    setPhase({ kind: 'looking', done: 0, total: lines.length })
    try {
      const { resolved, notFound } = await lookupDecklist(lines, (done, total) =>
        setPhase({ kind: 'looking', done, total }),
      )
      setPhase({
        kind: 'ready',
        deck: buildImportedDeck(name, text, resolved, notFound, entryIdByKeyword, textKeywords),
      })
    } catch (error) {
      setPhase({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not reach Scryfall',
      })
    }
  }

  const ready = phase.kind === 'ready' ? phase.deck : null

  return (
    <article className="detail">
      <div className="detail-top">
        <button className="ghost back" onClick={onCancel}>
          ‹ Decks
        </button>
      </div>
      <header className="detail-head">
        <h1>Add a deck</h1>
        <p className="muted">
          Paste the text export from Archidekt (Export, then Text) or Moxfield (More, then Export).
          Cards are looked up on Scryfall and the deck is kept on this device only.
        </p>
      </header>

      {!ready && (
        <>
          <label className="field">
            <span className="field-label">Decklist</span>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (phase.kind !== 'edit') setPhase({ kind: 'edit' })
              }}
              placeholder={
                'Commander\n1 Yuriko, the Tiger’s Shadow\n\nDeck\n1 Ninja of the Deep Hours\n…'
              }
              rows={12}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={phase.kind === 'looking'}
              aria-label="Decklist"
            />
          </label>
          <label className="field">
            <span className="field-label">Name (optional)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Named after the commander if left blank"
              disabled={phase.kind === 'looking'}
              aria-label="Deck name"
            />
          </label>
          <div className="row wrap">
            <button
              className="primary"
              onClick={lookUp}
              disabled={lines.length === 0 || phase.kind === 'looking'}
            >
              {phase.kind === 'looking'
                ? `Looking up ${phase.done} of ${phase.total}…`
                : `Look up ${lines.length} ${lines.length === 1 ? 'card' : 'cards'}`}
            </button>
            <span className="faint small">
              {text.trim() !== '' && lines.length === 0 ? 'No card lines recognised yet.' : ''}
            </span>
          </div>
          {phase.kind === 'looking' && (
            <div
              className="progress"
              role="progressbar"
              aria-valuenow={phase.done}
              aria-valuemax={phase.total}
            >
              <div style={{ width: `${phase.total ? (phase.done / phase.total) * 100 : 0}%` }} />
            </div>
          )}
          {phase.kind === 'error' && <div className="notice error">{phase.message}</div>}
        </>
      )}

      {ready && (
        <>
          <section className="block">
            <div className="block-head">
              <h3>Ready to save</h3>
            </div>
            <div className="import-summary">
              <strong>{ready.name}</strong>
              {ready.commanders.length > 0 && (
                <span className="muted">{ready.commanders.join(' / ')}</span>
              )}
              <span className="faint small">
                {ready.cardCount} cards · {ready.keywords.length} mechanics
              </span>
            </div>
            {ready.unresolved && ready.unresolved.length > 0 && (
              <div className="notice">
                <strong>{ready.unresolved.length} not found on Scryfall</strong>
                <ul className="unresolved">
                  {ready.unresolved.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <span className="faint small">
                  They are left out. Fix the lines and look up again, or save without them.
                </span>
              </div>
            )}
          </section>
          <div className="row wrap">
            <button className="primary" onClick={() => onSave(ready)}>
              Save deck
            </button>
            <button className="ghost" onClick={() => setPhase({ kind: 'edit' })}>
              Edit list
            </button>
          </div>
        </>
      )}
    </article>
  )
}
