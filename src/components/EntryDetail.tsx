import { useState } from 'react'
import type { Entry } from '../lib/codex'
import { codex, entriesById, ruleNode } from '../lib/codexData'
import { decksUsing } from '../lib/decksData'
import type { ExampleCard } from '../lib/scryfall'
import { CardImage } from './CardImage'
import { ExampleCardsBlock } from './ExampleCards'
import { KindBadge } from './KindBadge'
import { RuleText } from './RuleText'
import { RuleTree } from './RuleTree'
import { SourceTag } from './SourceTag'

interface Props {
  entry: Entry
  onOpen: (id: string) => void
  onOpenDeck: (id: number) => void
  onBack: () => void
}

const RULES_SOURCE = `Comprehensive Rules, ${codex.comprehensiveRules.effectiveDate}`

export function EntryDetail({ entry, onOpen, onOpenDeck, onBack }: Props) {
  const [card, setCard] = useState<ExampleCard | null>(null)
  const wiki = entry.wiki
  const related = entry.related
    .map((id) => entriesById.get(id))
    .filter((e): e is Entry => e !== undefined)
  const sections = entry.ruleNumbers.map((n) => ({ number: n, node: ruleNode(n) }))
  const uses = decksUsing(entry.id)
  const hasRules = sections.some((s) => s.node && !s.node.omitted)

  const metaParts: string[] = []
  if (wiki?.abilityType) metaParts.push(`${wiki.abilityType} ability`)
  if (wiki?.firstSet) metaParts.push(`introduced in ${wiki.firstSet}`)

  return (
    <article className="detail" key={entry.id}>
      <div className="detail-top">
        <button className="ghost back" onClick={onBack} aria-label="Back to the list">
          ‹ Back
        </button>
      </div>
      <header className="detail-head">
        <div className="row wrap">
          <h1>{entry.name}</h1>
          <KindBadge kind={entry.kind} />
        </div>
        {metaParts.length > 0 && (
          <p className="muted">
            {metaParts.join(', ')} <SourceTag>MTG Wiki</SourceTag>
          </p>
        )}
      </header>

      {wiki?.reminder && (
        <section className="block reminder">
          <div className="block-head">
            <h3>Reminder text</h3>
            <SourceTag>MTG Wiki</SourceTag>
          </div>
          <p className="reminder-text">{wiki.reminder}</p>
        </section>
      )}

      {entry.glossary && (
        <section className="block">
          <div className="block-head">
            <h3>Glossary</h3>
            <SourceTag href={codex.comprehensiveRules.sourceUrl}>{RULES_SOURCE}</SourceTag>
          </div>
          <p className="glossary-text">
            <RuleText text={entry.glossary} onOpen={onOpen} selfId={entry.id} />
          </p>
        </section>
      )}

      {wiki && (wiki.summary || wiki.sectionOf) && (
        <section className="block">
          <div className="block-head">
            <h3>In short</h3>
            <SourceTag href={wiki.url}>MTG Wiki</SourceTag>
          </div>
          {wiki.summary && wiki.summary.split('\n').map((para, i) => <p key={i}>{para}</p>)}
          {wiki.sectionOf && (
            <p className="muted">
              The wiki covers this under its {wiki.sectionOf} article.{' '}
              <a href={wiki.url} target="_blank" rel="noreferrer">
                Read that section ↗
              </a>
            </p>
          )}
        </section>
      )}

      <section className="block">
        <div className="block-head">
          <h3>Rules</h3>
          <SourceTag href={codex.comprehensiveRules.sourceUrl}>{RULES_SOURCE}</SourceTag>
        </div>
        {!hasRules && sections.length === 0 && (
          <p className="muted">
            The Comprehensive Rules effective {codex.comprehensiveRules.effectiveDate} have no entry
            under this name.
          </p>
        )}
        {sections.map(({ number, node }) =>
          node && !node.omitted ? (
            <RuleTree key={number} node={node} onOpen={onOpen} selfId={entry.id} />
          ) : (
            <p key={number} className="muted">
              Section {number}
              {node?.title ? `, ${node.title},` : ''} is the whole chapter and is not reproduced
              here.{' '}
              <a href={codex.comprehensiveRules.sourceUrl} target="_blank" rel="noreferrer">
                Open the rules ↗
              </a>
            </p>
          ),
        )}
      </section>

      {related.length > 0 && (
        <section className="block">
          <div className="block-head">
            <h3>Related</h3>
          </div>
          <div className="chips">
            {related.map((r) => (
              <button key={r.id} className="chip" onClick={() => onOpen(r.id)}>
                {r.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {uses.length > 0 && (
        <section className="block">
          <div className="block-head">
            <h3>In your decks</h3>
            <SourceTag>Archidekt</SourceTag>
          </div>
          <ul className="entry-list">
            {uses.map(({ deck, cards }) => (
              <li key={deck.id}>
                <button className="entry-row" onClick={() => onOpenDeck(deck.id)}>
                  <span className="entry-row-head">
                    <strong>{deck.name}</strong>
                    <span className="count">
                      {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                    </span>
                  </span>
                  <span className="entry-row-cards">{cards.join(', ')}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {entry.scryfallKeyword && (
        <ExampleCardsBlock
          key={entry.scryfallKeyword}
          keyword={entry.scryfallKeyword}
          onPick={setCard}
        />
      )}

      {card && <CardImage card={card} onClose={() => setCard(null)} />}
    </article>
  )
}
