import type { ExampleCard } from '../lib/scryfall'

interface Props {
  card: ExampleCard
  onClose: () => void
}

/** A card at readable size, over everything else. */
export function CardImage({ card, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="card-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={card.name}
      >
        {card.imageNormal ? (
          <img src={card.imageNormal} alt={card.name} />
        ) : (
          <div className="card-placeholder large">{card.name}</div>
        )}
        <div className="row">
          <a className="button-link" href={card.scryfallUri} target="_blank" rel="noreferrer">
            Open on Scryfall ↗
          </a>
          <span className="spacer" />
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
