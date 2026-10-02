import { codex } from '../lib/codexData'

/** Where everything comes from, and the notices the sources ask for. */
export function About({ onClose }: { onClose: () => void }) {
  const generated = new Date(codex.generatedAt)
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="About MTG Codex"
      >
        <div className="stackable">
          <div className="row">
            <h1>About</h1>
            <span className="spacer" />
            <button className="icon ghost" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <p>
            A codex of every keyword ability, keyword action, ability word and rules term in Magic:
            The Gathering, built for looking things up mid-game. Nothing here is written by hand.
            Each block of text names its source.
          </p>
          <div>
            <h3>Sources</h3>
            <ul className="sources">
              <li>
                <strong>Comprehensive Rules</strong>, effective{' '}
                {codex.comprehensiveRules.effectiveDate}, from{' '}
                <a href="https://magic.wizards.com/en/rules" target="_blank" rel="noreferrer">
                  magic.wizards.com/rules
                </a>
                . Rules text and glossary definitions are quoted verbatim.
              </li>
              <li>
                <strong>Scryfall</strong>, for the keyword names as printed on cards and for the
                example cards, which load live and are cached on this device.
              </li>
              <li>
                <strong>MTG Wiki</strong> (
                <a href="https://mtg.wiki" target="_blank" rel="noreferrer">
                  mtg.wiki
                </a>
                ), for the plain-English summary, reminder text and introducing set. Wiki text is
                licensed{' '}
                <a
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY-NC-SA 4.0
                </a>
                .
              </li>
            </ul>
          </div>
          <p className="faint small">
            Data compiled {generated.toLocaleDateString(undefined, { dateStyle: 'long' })}.{' '}
            {codex.entries.length.toLocaleString()} entries. Works offline once loaded.
          </p>
          <p className="faint small">
            MTG Codex is unofficial Fan Content permitted under the Fan Content Policy. Not
            approved/endorsed by Wizards. Portions of the materials used are property of Wizards of
            the Coast. ©Wizards of the Coast LLC.
          </p>
        </div>
      </div>
    </div>
  )
}
