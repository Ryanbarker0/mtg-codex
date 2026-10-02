import type { RuleNode } from '../../src/lib/codex.ts'

/**
 * Parser for the plain-text Comprehensive Rules that Wizards publishes.
 *
 * The file is a title, a table of contents, the numbered rules, a glossary and credits.
 * Every rule is one physical line that starts with its number. Keyword abilities (702)
 * and keyword actions (701) are named subsections such as "702.74. Evoke". The parser
 * builds a tree keyed by number so any section can be pulled out with its subrules.
 */

export interface ParsedRules {
  effectiveDate: string
  /** Every rule node by number, e.g. rules.get('702.74'). */
  rules: Map<string, RuleNode>
  /** Glossary term to definition. Definitions keep their paragraph breaks. */
  glossary: Map<string, string>
  /** Ability words listed in rule 207.2c, lower case as printed there. */
  abilityWords: string[]
}

/** Sentences end in punctuation; titles do not, except for "For Mirrodin!" and "Start Your Engines!". */
const SENTENCE_END = /[.”"’:;?]$/
const BLANK = /^\s*$/

const sectionHeader = /^(\d{3})\. (.+)$/
const topHeader = /^(\d)\. (.+)$/
const numbered = /^(\d{3}\.\d+)\. (.+)$/
const lettered = /^(\d{3}\.\d+[a-z]) (.+)$/
const example = /^Example: (.+)$/

/** A "702.74. Evoke" line is a title; a "100.1. These Magic rules apply..." line is a rule. */
export function isSubsectionTitle(text: string): boolean {
  if (text.length > 60) return false
  if (text.includes('. ')) return false
  return !SENTENCE_END.test(text)
}

function parentNumber(number: string): string | undefined {
  if (/[a-z]$/.test(number)) return number.slice(0, -1)
  const dot = number.lastIndexOf('.')
  if (dot !== -1) return number.slice(0, dot)
  if (number.length === 3) return number[0]
  return undefined
}

/** Index of the nth line equal to `needle`, so the contents list can be skipped. */
function nthIndex(lines: string[], needle: string, n: number): number {
  let seen = 0
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === needle) {
      seen += 1
      if (seen === n) return i
    }
  }
  return -1
}

export function parseComprehensiveRules(source: string): ParsedRules {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')

  const dateLine = lines.find((l) => l.startsWith('These rules are effective as of '))
  const effectiveDate = dateLine?.match(/as of (.+?)\.?$/)?.[1]
  if (!effectiveDate) throw new Error('Could not find the effective date')

  // The contents list repeats every header, so the body starts at the second "1. Game Concepts".
  const bodyStart = nthIndex(lines, '1. Game Concepts', 2)
  const glossaryStart = nthIndex(lines, 'Glossary', 2)
  const creditsStart = nthIndex(lines, 'Credits', 2)
  if (bodyStart === -1 || glossaryStart === -1 || creditsStart === -1) {
    throw new Error('Could not find the body, glossary and credits boundaries')
  }

  const rules = new Map<string, RuleNode>()
  const add = (node: RuleNode) => {
    rules.set(node.number, node)
    const parent = parentNumber(node.number)
    if (parent) rules.get(parent)?.children.push(node)
  }

  let last: RuleNode | undefined
  for (let i = bodyStart; i < glossaryStart; i += 1) {
    const line = lines[i].trim()
    if (BLANK.test(line)) continue

    let match = line.match(lettered)
    if (match) {
      last = { number: match[1], text: match[2], children: [] }
      add(last)
      continue
    }
    match = line.match(numbered)
    if (match) {
      last = isSubsectionTitle(match[2])
        ? { number: match[1], title: match[2], children: [] }
        : { number: match[1], text: match[2], children: [] }
      add(last)
      continue
    }
    match = line.match(sectionHeader)
    if (match) {
      last = { number: match[1], title: match[2], children: [] }
      add(last)
      continue
    }
    match = line.match(topHeader)
    if (match) {
      last = { number: match[1], title: match[2], children: [] }
      add(last)
      continue
    }
    match = line.match(example)
    if (match && last) {
      last.examples = [...(last.examples ?? []), match[1]]
      continue
    }
    // Anything else continues the previous paragraph.
    if (last?.text !== undefined) last.text = `${last.text}\n${line}`
  }

  const glossary = new Map<string, string>()
  let term: string | undefined
  let definition: string[] = []
  const flush = () => {
    if (term) glossary.set(term, definition.join('\n'))
    term = undefined
    definition = []
  }
  for (let i = glossaryStart + 1; i < creditsStart; i += 1) {
    const line = lines[i].trim()
    if (BLANK.test(line)) {
      flush()
      continue
    }
    if (term === undefined) term = line
    else definition.push(line)
  }
  flush()

  const abilityWordsRule = rules.get('207.2c')?.text ?? ''
  const abilityWords = parseAbilityWords(abilityWordsRule)

  return { effectiveDate, rules, glossary, abilityWords }
}

/** Rule 207.2c ends with "The ability words are a, b, c, and d." */
export function parseAbilityWords(text: string): string[] {
  const match = text.match(/The ability words are (.+?)\.?$/s)
  if (!match) return []
  return match[1]
    .split(/,\s*/)
    .map((w) => w.replace(/^and\s+/, '').trim())
    .filter((w) => w.length > 0)
}

/** Rule numbers mentioned in text, e.g. "See rule 702.74" or "rules 702.19 and 702.20". */
export function referencedRules(text: string): string[] {
  const found: string[] = []
  const pattern = /\brules? ((?:\d{3}(?:\.\d+[a-z]?)?)(?:(?:,| and|, and) \d{3}(?:\.\d+[a-z]?)?)*)/g
  for (const match of text.matchAll(pattern)) {
    for (const n of match[1].match(/\d{3}(?:\.\d+[a-z]?)?/g) ?? []) {
      if (!found.includes(n)) found.push(n)
    }
  }
  return found
}

/** Deep copy of a node and its descendants, for writing into the codex. */
export function cloneTree(node: RuleNode): RuleNode {
  return {
    ...node,
    examples: node.examples ? [...node.examples] : undefined,
    children: node.children.map(cloneTree),
  }
}

/** Total characters of text in a subtree, used to keep the codex a sensible size. */
export function treeSize(node: RuleNode): number {
  return (
    (node.title?.length ?? 0) +
    (node.text?.length ?? 0) +
    (node.examples?.reduce((n, e) => n + e.length, 0) ?? 0) +
    node.children.reduce((n, c) => n + treeSize(c), 0)
  )
}
