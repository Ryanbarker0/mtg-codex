import { useEffect, useState } from 'react'
import { fetchExampleCards, type ExampleCard, type ExampleCards } from '../lib/scryfall'
import { SourceTag } from './SourceTag'

interface Props {
  keyword: string
  onPick: (card: ExampleCard) => void
}

/**
 * Cards that carry the keyword, from Scryfall, most played in Commander first. Mount it with
 * `key={keyword}` so a new keyword starts from empty state.
 */
export function ExampleCardsBlock({ keyword, onPick }: Props) {
  const [result, setResult] = useState<ExampleCards | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchExampleCards(keyword)
      .then((r) => {
        if (!cancelled) setResult(r)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not reach Scryfall')
      })
    return () => {
      cancelled = true
    }
  }, [keyword])

  return (
    <section className="block">
      <div className="block-head">
        <h3>Cards with {keyword}</h3>
        <SourceTag href={result?.searchUrl}>
          {result ? `${result.total.toLocaleString()} on Scryfall` : 'Scryfall'}
        </SourceTag>
      </div>
      {error && <div className="notice error">{error}</div>}
      {!result && !error && <div className="card-grid loading" aria-busy="true" />}
      {result && result.cards.length === 0 && (
        <p className="faint">Scryfall lists no paper cards with this keyword.</p>
      )}
      {result && result.cards.length > 0 && (
        <div className="card-grid">
          {result.cards.map((card) => (
            <button
              key={card.id}
              className="card-tile"
              onClick={() => onPick(card)}
              aria-label={card.name}
            >
              {card.imageSmall ? (
                <img src={card.imageSmall} alt="" loading="lazy" />
              ) : (
                <span className="card-placeholder">{card.name}</span>
              )}
              <span className="card-name">{card.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
