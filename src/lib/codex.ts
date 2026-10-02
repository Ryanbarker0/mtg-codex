/**
 * The shape of the generated codex, shared by the ingest script that writes it and the
 * app that reads it. Every field traces back to one of three sources and says which:
 *
 * - `rule`, `glossary` and `rules`: the Magic Comprehensive Rules published by Wizards.
 * - `wiki`: the MTG Wiki (mtg.wiki), licensed CC BY-NC-SA 4.0.
 * - `scryfall`: the Scryfall keyword catalogs; card examples are fetched live from Scryfall.
 *
 * Nothing in the codex is hand-authored. If a field is missing, the source did not have it.
 */

export type EntryKind = 'keyword-ability' | 'keyword-action' | 'ability-word' | 'term'

export interface RuleNode {
  /** e.g. "702", "702.74", "702.74a" */
  number: string
  /** Named sections and keyword subsections have a title, e.g. "Evoke". */
  title?: string
  /** Rule text, present on numbered and lettered rules. */
  text?: string
  /** "Example:" paragraphs that follow this rule in the document. */
  examples?: string[]
  /** True when the section was too long to include; only the title is kept so the app can name it. */
  omitted?: boolean
  children: RuleNode[]
}

export interface WikiInfo {
  title: string
  url: string
  /** The page's lead section as plain text. Absent when the entry points at a section of a broader page. */
  summary?: string
  /** Reminder text as the wiki transcribes it from cards. */
  reminder?: string
  /** Static, Triggered, Activated or a combination. */
  abilityType?: string
  /** The set that introduced the mechanic. */
  firstSet?: string
  /** For entries that redirect to a section of another page: that page's title. */
  sectionOf?: string
}

export interface Entry {
  /** URL-safe identifier derived from the name. */
  id: string
  name: string
  kind: EntryKind
  /** Rule numbers this entry is defined by or refers to, looked up in `Codex.rules`. */
  ruleNumbers: string[]
  /** The Comprehensive Rules glossary definition, verbatim. */
  glossary?: string
  wiki?: WikiInfo
  /** The exact Scryfall keyword to search with, when Scryfall tracks this name. */
  scryfallKeyword?: string
  /** Ids of entries this one is a variant of or closely tied to, derived from the wiki or the rules. */
  related: string[]
}

export interface Codex {
  generatedAt: string
  comprehensiveRules: {
    effectiveDate: string
    sourceUrl: string
  }
  entries: Entry[]
  /** Rule sections referenced by entries, keyed by number. Only referenced sections are kept. */
  rules: Record<string, RuleNode>
}
