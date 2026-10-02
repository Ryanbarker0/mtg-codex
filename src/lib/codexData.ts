import codexJson from '../data/codex.json'
import type { Codex, Entry, RuleNode } from './codex'

/** The generated codex and the lookups the app needs from it. */
export const codex = codexJson as unknown as Codex

export const entriesById = new Map(codex.entries.map((e) => [e.id, e]))

/**
 * Rule number to the entry it defines, so "see rule 702.74" can link to Evoke. Only named
 * sections map. When several entries share a section (Ninjutsu and Commander ninjutsu both
 * point at 702.49), the one named like the section wins, then a keyword over a glossary term.
 */
export const entryByRule = new Map<string, Entry>()
const claim = (entry: Entry, title: string): number =>
  entry.name.toLowerCase() === title.toLowerCase() ? 2 : entry.kind === 'term' ? 0 : 1
for (const entry of codex.entries) {
  for (const n of entry.ruleNumbers) {
    const node = codex.rules[n]
    if (!node?.title) continue
    const current = entryByRule.get(n)
    if (!current || claim(entry, node.title) > claim(current, node.title)) {
      entryByRule.set(n, entry)
    }
  }
}

/** Resolves a referenced rule number to an entry, walking up to the section that defines it. */
export function entryForRule(number: string): Entry | undefined {
  let n = number
  for (;;) {
    const entry = entryByRule.get(n)
    if (entry) return entry
    if (/[a-z]$/.test(n)) n = n.slice(0, -1)
    else if (n.includes('.')) n = n.slice(0, n.lastIndexOf('.'))
    else return undefined
  }
}

export function ruleNode(number: string): RuleNode | undefined {
  return codex.rules[number]
}
