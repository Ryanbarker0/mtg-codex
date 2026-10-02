import { useEffect, useMemo, useRef, useState } from 'react'
import { About } from './components/About'
import { DeckDetail } from './components/DeckDetail'
import { DeckImport } from './components/DeckImport'
import { DeckList } from './components/DeckList'
import { EntryDetail } from './components/EntryDetail'
import { EntryList } from './components/EntryList'
import type { Entry } from './lib/codex'
import { codex, entriesById } from './lib/codexData'
import { builtInDecks, decksData } from './lib/decksData'
import { loadRecent, pushRecent } from './lib/recent'
import { CODEX_ROOT, DECK_IMPORT, DECKS_ROOT, useRoute } from './lib/route'
import { indexEntries, search, type KindFilter } from './lib/search'
import { useUserDecks } from './state/useUserDecks'

const FILTERS: Array<{ value: KindFilter; label: string }> = [
  { value: 'keywords', label: 'Keywords' },
  { value: 'keyword-ability', label: 'Abilities' },
  { value: 'keyword-action', label: 'Actions' },
  { value: 'ability-word', label: 'Ability words' },
  { value: 'term', label: 'Rules terms' },
  { value: 'all', label: 'Everything' },
]

const index = indexEntries(codex.entries)
const BUILT_IN_KEY = 'mtg-codex:show-built-in-decks'

function loadShowBuiltIn(): boolean {
  try {
    return localStorage.getItem(BUILT_IN_KEY) !== 'false'
  } catch {
    return true
  }
}

export default function App() {
  const { route, navigate, back } = useRoute()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<KindFilter>('keywords')
  // An entry opened by address (a shared link, or the app reopening on one) counts as recent too.
  const [recent, setRecent] = useState<string[]>(() =>
    route.view === 'codex' && route.entryId && entriesById.has(route.entryId)
      ? pushRecent(route.entryId)
      : loadRecent(),
  )
  const [about, setAbout] = useState(false)
  const [showBuiltIn, setShowBuiltIn] = useState(loadShowBuiltIn)
  const userDecks = useUserDecks()
  const inputRef = useRef<HTMLInputElement>(null)
  const detailRef = useRef<HTMLElement>(null)

  const allDecks = [...userDecks.decks, ...builtInDecks]
  const entryId = route.view === 'codex' ? route.entryId : null
  const entry = entryId ? entriesById.get(entryId) : undefined
  const deckId = route.view === 'decks' ? route.deckId : null
  const importing = route.view === 'decks' && route.importing === true
  const deck = deckId !== null ? allDecks.find((d) => d.id === deckId) : undefined
  const showingDetail = entryId !== null || deckId !== null || importing

  const toggleBuiltIn = () => {
    const next = !showBuiltIn
    setShowBuiltIn(next)
    try {
      localStorage.setItem(BUILT_IN_KEY, String(next))
    } catch {
      // Preference just will not persist.
    }
  }

  const results = useMemo(() => search(index, query, filter), [query, filter])

  // The page title follows what is open so the browser history reads well, and a new page
  // starts at the top rather than wherever the last one was scrolled to.
  useEffect(() => {
    const name = entry?.name ?? deck?.name
    document.title = name ? `${name} · MTG Codex` : 'MTG Codex'
    detailRef.current?.scrollTo({ top: 0 })
  }, [entry, deck])

  const recentEntries = recent
    .map((id) => entriesById.get(id))
    .filter((e): e is Entry => e !== undefined)

  const openEntry = (id: string) => {
    setRecent(pushRecent(id))
    navigate({ view: 'codex', entryId: id })
  }
  const openDeck = (id: string) => navigate({ view: 'decks', deckId: id })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (results.length > 0) openEntry(results[0].id)
    inputRef.current?.blur()
  }

  const emptyMessage =
    query.trim() === ''
      ? 'Nothing to list.'
      : `Nothing matches “${query.trim()}”${filter === 'all' ? '' : ' in this filter'}.`

  return (
    <div className={`app${showingDetail ? ' showing-detail' : ''}`}>
      <header className="topbar">
        <div className="title">
          <h1>MTG Codex</h1>
          <small>Rules effective {codex.comprehensiveRules.effectiveDate}</small>
        </div>
        <span className="spacer" />
        <nav className="segments" aria-label="Section">
          <button
            className={route.view === 'codex' ? 'on' : ''}
            aria-current={route.view === 'codex' ? 'page' : undefined}
            onClick={() => navigate(CODEX_ROOT)}
          >
            Codex
          </button>
          <button
            className={route.view === 'decks' ? 'on' : ''}
            aria-current={route.view === 'decks' ? 'page' : undefined}
            onClick={() => navigate(DECKS_ROOT)}
          >
            Decks
          </button>
        </nav>
        <button
          className="icon ghost"
          onClick={() => setAbout(true)}
          aria-label="About and sources"
        >
          ⓘ
        </button>
      </header>

      {route.view === 'codex' && (
        <div className="panes">
          <section className="pane list-pane" aria-label="Search">
            <form className="search" onSubmit={onSubmit} role="search">
              <input
                ref={inputRef}
                type="search"
                name="q"
                placeholder="Search a keyword, mechanic or term…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="search"
                aria-label="Search the codex"
              />
              {query !== '' && (
                <button
                  type="button"
                  className="icon ghost clear"
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </form>
            <div className="filters" role="radiogroup" aria-label="Filter by kind">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  role="radio"
                  aria-checked={filter === f.value}
                  className={`chip${filter === f.value ? ' on' : ''}`}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="pane-body">
              {query.trim() === '' && recentEntries.length > 0 && (
                <div className="recent">
                  <h3>Recent</h3>
                  <div className="chips">
                    {recentEntries.map((e) => (
                      <button key={e.id} className="chip" onClick={() => openEntry(e.id)}>
                        {e.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="result-count faint">
                {results.length.toLocaleString()} {results.length === 1 ? 'entry' : 'entries'}
              </div>
              <EntryList
                entries={results}
                selectedId={entry?.id ?? null}
                onOpen={openEntry}
                emptyMessage={emptyMessage}
              />
            </div>
          </section>

          <section className="pane detail-pane" aria-label="Entry" ref={detailRef}>
            {entry ? (
              <EntryDetail
                entry={entry}
                decks={allDecks}
                onOpen={openEntry}
                onOpenDeck={openDeck}
                onBack={() => back(CODEX_ROOT)}
              />
            ) : entryId ? (
              <div className="detail">
                <div className="detail-top">
                  <button className="ghost back" onClick={() => back(CODEX_ROOT)}>
                    ‹ Back
                  </button>
                </div>
                <div className="empty">No entry called “{entryId}”.</div>
              </div>
            ) : (
              <div className="detail-placeholder faint">
                <p>Pick a keyword, mechanic or rules term.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {route.view === 'decks' && (
        <div className="panes">
          <section className="pane list-pane" aria-label="Decks">
            <div className="pane-body">
              <DeckList
                userDecks={userDecks.decks}
                builtInDecks={builtInDecks}
                builtInLabel={`${decksData.folder.owner}'s decks`}
                showBuiltIn={showBuiltIn}
                onToggleBuiltIn={toggleBuiltIn}
                selectedId={deck?.id ?? null}
                onOpen={openDeck}
                onImport={() => navigate(DECK_IMPORT)}
              />
            </div>
          </section>

          <section className="pane detail-pane" aria-label="Deck" ref={detailRef}>
            {importing ? (
              <DeckImport
                onSave={(saved) => {
                  userDecks.addDeck(saved)
                  navigate({ view: 'decks', deckId: saved.id })
                }}
                onCancel={() => back(DECKS_ROOT)}
              />
            ) : deck ? (
              <DeckDetail
                deck={deck}
                onOpenEntry={openEntry}
                onRemove={
                  deck.source.kind === 'imported'
                    ? () => {
                        userDecks.removeDeck(deck.id)
                        navigate(DECKS_ROOT)
                      }
                    : undefined
                }
                onBack={() => back(DECKS_ROOT)}
              />
            ) : deckId !== null && !userDecks.loaded ? (
              <div className="detail-placeholder faint">
                <p>Loading…</p>
              </div>
            ) : deckId !== null ? (
              <div className="detail">
                <div className="detail-top">
                  <button className="ghost back" onClick={() => back(DECKS_ROOT)}>
                    ‹ Decks
                  </button>
                </div>
                <div className="empty">No deck with id {deckId} on this device.</div>
              </div>
            ) : (
              <div className="detail-placeholder faint">
                <p>Pick a deck to see every mechanic in it.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {about && <About onClose={() => setAbout(false)} />}
    </div>
  )
}
