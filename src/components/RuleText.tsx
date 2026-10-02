import type { ReactNode } from 'react'
import { entryForRule } from '../lib/codexData'

interface Props {
  text: string
  onOpen: (id: string) => void
  /** The entry being shown, so references to its own rules stay plain text. */
  selfId?: string
}

const RULE_REF = /\b(\d{3}(?:\.\d+[a-z]?)?)\b/g

/**
 * Rule text with "rule 702.74" style references turned into links to the entry that
 * section defines. Numbers that match no entry stay as text.
 */
export function RuleText({ text, onOpen, selfId }: Props) {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(RULE_REF)) {
    const number = match[1]
    const index = match.index
    // Only link numbers that the surrounding words present as a rule reference.
    const before = text.slice(Math.max(0, index - 12), index)
    const isReference = /\brules?\s+$|,\s+$|\band\s+$/.test(before)
    const entry = isReference ? entryForRule(number) : undefined
    if (!entry || entry.id === selfId) continue
    parts.push(text.slice(last, index))
    parts.push(
      <button key={`${index}-${number}`} className="link" onClick={() => onOpen(entry.id)}>
        {number}
      </button>,
    )
    last = index + number.length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}
