import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Codex, Entry, EntryKind, RuleNode, WikiInfo } from '../src/lib/codex.ts'
import {
  cloneTree,
  parseComprehensiveRules,
  referencedRules,
  treeSize,
  type ParsedRules,
} from './lib/comprehensiveRules.ts'
import { fetchPages, wikiInfoFromPage, type WikiPage } from './lib/wiki.ts'

/**
 * Builds src/data/codex.json from three sources, in this order of authority:
 *
 * 1. The Comprehensive Rules: the current text file linked from magic.wizards.com/en/rules.
 *    Sections 701 and 702 define every keyword action and keyword ability; the glossary
 *    defines the rest of the vocabulary and points at the rules behind each term.
 * 2. Scryfall's catalogs of keyword abilities, keyword actions and ability words, which give
 *    the spelling as printed on cards and the exact search term for example cards.
 * 3. The MTG Wiki, for the plain-English summary, reminder text and introducing set.
 *
 * Run with `npm run ingest`. The output is committed so builds are reproducible and the app
 * never depends on these sites at runtime for its definitions.
 */

const RULES_PAGE = 'https://magic.wizards.com/en/rules'
const SCRYFALL = 'https://api.scryfall.com'
const USER_AGENT = 'mtg-codex-ingest/0.1 (https://github.com/Ryanbarker0/mtg-codex)'
const OUTPUT = path.resolve(import.meta.dirname, '../src/data/codex.json')
/** Rule 207.2c is the sentence that says ability words have no rules meaning. */
const ABILITY_WORD_RULE = '207.2c'
/** Sections longer than this (in characters) are named but not included. Only 701 and 702 exceed it. */
const MAX_SECTION_SIZE = 30_000

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`)
  return response.text()
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`)
  return (await response.json()) as T
}

/** The rules page links the current .txt, .pdf and .docx; the file name carries the date. */
export function findRulesTextUrl(html: string): string {
  const match = html.match(/https?:\/\/media\.wizards\.com\/[^"' ]*CompRules[^"']*?\.txt/i)
  if (!match) throw new Error('Could not find the Comprehensive Rules .txt link')
  return match[0].replace(/ /g, '%20')
}

async function scryfallCatalog(name: string): Promise<string[]> {
  const body = await fetchJson<{ data: string[] }>(`${SCRYFALL}/catalog/${name}`)
  return body.data
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const sentenceCase = (s: string) => capitalise(s.toLowerCase())
/** Drafts are keyed by slug so "∞ (Infinity)" and the glossary's "Infinity" are one entry. */
const key = slugify

interface Draft {
  name: string
  kind: EntryKind
  ruleNumbers: Set<string>
  scryfallKeyword?: string
  related: Set<string>
  wiki?: WikiInfo
  glossary?: string
}

function buildDrafts(
  parsed: ParsedRules,
  catalogs: Record<EntryKind, string[]>,
): Map<string, Draft> {
  const drafts = new Map<string, Draft>()
  const ensure = (name: string, kind: EntryKind): Draft => {
    const existing = drafts.get(key(name))
    if (existing) return existing
    const draft: Draft = { name, kind, ruleNumbers: new Set(), related: new Set() }
    drafts.set(key(name), draft)
    return draft
  }

  // Keyword abilities and actions defined by the rules.
  for (const [section, kind] of [
    ['702', 'keyword-ability'],
    ['701', 'keyword-action'],
  ] as const) {
    for (const node of parsed.rules.get(section)?.children ?? []) {
      if (!node.title) continue
      ensure(node.title, kind).ruleNumbers.add(node.number)
    }
  }

  // Ability words listed in rule 207.2c have no rules of their own; that rule says so.
  for (const word of parsed.abilityWords) {
    ensure(capitalise(word), 'ability-word').ruleNumbers.add(ABILITY_WORD_RULE)
  }

  // Scryfall's catalogs: adopt the card spelling and record the search term.
  for (const kind of ['keyword-ability', 'keyword-action', 'ability-word'] as const) {
    for (const name of catalogs[kind]) {
      const draft = ensure(name, kind)
      draft.name = name
      draft.scryfallKeyword = name
      if (kind === 'ability-word') draft.ruleNumbers.add(ABILITY_WORD_RULE)
    }
  }

  // Glossary: attach definitions to existing entries, add the rest as terms. A heading that
  // lists variants, such as “Partner, “Partner—[text],” “Partner with [name]”, belongs to the
  // entry named before the first comma.
  for (const [term, definition] of parsed.glossary) {
    const primary = term.split(/,\s*/)[0]
    const draft = drafts.get(key(term)) ?? drafts.get(key(primary)) ?? ensure(term, 'term')
    draft.glossary = definition
    for (const n of referencedRules(definition)) {
      if (parsed.rules.has(n)) draft.ruleNumbers.add(n)
    }
  }

  return drafts
}

/** Disambiguation pages are retried with the qualifiers the wiki uses for mechanics. */
const QUALIFIERS: Record<EntryKind, string[]> = {
  'keyword-action': ['keyword action', 'keyword', 'mechanic'],
  'keyword-ability': ['keyword ability', 'keyword', 'mechanic'],
  'ability-word': ['ability word', 'mechanic'],
  term: [],
}

async function attachWiki(drafts: Map<string, Draft>): Promise<void> {
  const wanted = [...drafts.values()].filter((d) => d.kind !== 'term')
  const settled = new Map<Draft, WikiPage>()

  const lookup = async (requests: Array<{ draft: Draft; title: string }>) => {
    const pages = await fetchPages(requests.map((r) => r.title))
    for (const page of pages) {
      const draft = requests.find((r) => r.title === page.requested)?.draft
      if (draft && !page.missing && !page.disambiguation && !settled.has(draft)) {
        settled.set(draft, page)
      }
    }
    return pages
  }

  const first = await lookup(wanted.map((d) => ({ draft: d, title: d.name })))

  // Second pass: disambiguation pages get a qualifier; missing pages are retried in the
  // sentence case the wiki uses for multi-word titles ("Level Up" is "Level up" there).
  const retry: Array<{ draft: Draft; title: string }> = []
  for (const page of first) {
    const draft = wanted.find((d) => d.name === page.requested)
    if (!draft || settled.has(draft)) continue
    if (page.disambiguation) {
      for (const q of QUALIFIERS[draft.kind]) retry.push({ draft, title: `${draft.name} (${q})` })
    } else if (page.missing && sentenceCase(draft.name) !== draft.name) {
      retry.push({ draft, title: sentenceCase(draft.name) })
    }
  }
  if (retry.length > 0) await lookup(retry)

  for (const draft of wanted) {
    const page = settled.get(draft)
    if (!page) {
      console.warn(`wiki: no page for "${draft.name}"`)
      continue
    }
    draft.wiki = wikiInfoFromPage(page)
  }
}

/**
 * Names Scryfall tracks that the rules do not define under their own heading (Forestwalk,
 * Commander ninjutsu, Friends forever) are tied to the section that does define them, using
 * only evidence in the sources:
 *
 * - the wiki resolves the name to the page of an entry that has rules, or
 * - the rules spell the name out as a "[type]walk" / "[type]cycling" template, or
 * - exactly one keyword section quotes the name the way the rules introduce a variant,
 *   e.g. “Choose a Background” under Partner.
 */
function linkVariants(drafts: Map<string, Draft>, parsed: ParsedRules): string[] {
  const log: string[] = []
  const withRules = [...drafts.values()].filter((d) => d.ruleNumbers.size > 0)
  const byWikiTitle = new Map<string, Draft>()
  for (const d of withRules) {
    if (d.wiki && !d.wiki.sectionOf) byWikiTitle.set(d.wiki.title, d)
  }

  const templates: Array<{ suffix: string; draft: Draft }> = []
  const keywordSections: Array<{ node: RuleNode; draft: Draft }> = []
  for (const d of withRules) {
    for (const n of d.ruleNumbers) {
      if (!/^70[12]\.\d+$/.test(n)) continue
      const node = parsed.rules.get(n)
      if (!node) continue
      keywordSections.push({ node, draft: d })
      for (const m of flatText(node).matchAll(/\[[Tt]ype\]([a-z]+)/g)) {
        templates.push({ suffix: m[1], draft: d })
      }
    }
  }

  const link = (variant: Draft, parent: Draft, how: string) => {
    for (const n of parent.ruleNumbers) variant.ruleNumbers.add(n)
    variant.related.add(slugify(parent.name))
    parent.related.add(slugify(variant.name))
    log.push(`${variant.name} → ${parent.name} (${how})`)
  }

  for (const d of drafts.values()) {
    if (d.ruleNumbers.size > 0 || d.kind === 'term') continue
    const wikiParent = d.wiki && byWikiTitle.get(d.wiki.title)
    if (wikiParent && wikiParent !== d) {
      link(d, wikiParent, 'wiki')
      continue
    }
    const lower = d.name.toLowerCase()
    const template = templates.find(
      (t) => lower.endsWith(t.suffix) && lower.length > t.suffix.length,
    )
    if (template) {
      link(d, template.draft, `rules template [type]${template.suffix}`)
      continue
    }
    const quoted = `“${lower}`
    const mentions = keywordSections.filter(({ node }) =>
      flatText(node).toLowerCase().includes(quoted),
    )
    if (mentions.length === 1)
      link(d, mentions[0].draft, `quoted in rule ${mentions[0].node.number}`)
  }

  // Entries defined by the same keyword section are related, e.g. Ninjutsu and Commander ninjutsu.
  const bySection = new Map<string, Draft[]>()
  for (const d of drafts.values()) {
    for (const n of d.ruleNumbers) {
      if (/^70[12]\.\d+$/.test(n)) bySection.set(n, [...(bySection.get(n) ?? []), d])
    }
  }
  for (const group of bySection.values()) {
    for (const a of group) for (const b of group) if (a !== b) a.related.add(slugify(b.name))
  }
  return log
}

function flatText(node: RuleNode): string {
  return [node.title ?? '', node.text ?? '', ...node.children.map(flatText)].join('\n')
}

/** A reference to a rule and to one of its own subrules is just the reference to the rule. */
function dedupeNested(numbers: Set<string>): string[] {
  const list = [...numbers]
  return list
    .filter(
      (n) => !list.some((other) => other !== n && n.startsWith(other) && isDescendant(n, other)),
    )
    .sort()
}

function isDescendant(number: string, ancestor: string): boolean {
  const rest = number.slice(ancestor.length)
  return /^(\.\d+)?[a-z]?$/.test(rest) && rest.length > 0
}

function toEntries(drafts: Map<string, Draft>): Entry[] {
  const entries = [...drafts.values()].map((d): Entry => ({
    id: slugify(d.name),
    name: d.name,
    kind: d.kind,
    ruleNumbers: dedupeNested(d.ruleNumbers),
    ...(d.glossary ? { glossary: d.glossary } : {}),
    ...(d.wiki ? { wiki: d.wiki } : {}),
    ...(d.scryfallKeyword ? { scryfallKeyword: d.scryfallKeyword } : {}),
    related: [...d.related].sort(),
  }))
  const ids = new Set<string>()
  for (const e of entries) {
    if (ids.has(e.id)) throw new Error(`Duplicate entry id: ${e.id}`)
    ids.add(e.id)
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

function collectRules(entries: Entry[], parsed: ParsedRules): Record<string, RuleNode> {
  const rules: Record<string, RuleNode> = {}
  for (const entry of entries) {
    for (const n of entry.ruleNumbers) {
      const node = parsed.rules.get(n)
      if (!node || rules[n]) continue
      rules[n] =
        treeSize(node) > MAX_SECTION_SIZE
          ? { number: node.number, title: node.title, omitted: true, children: [] }
          : cloneTree(node)
    }
  }
  return rules
}

async function main() {
  const started = Date.now()
  const elapsed = () => `${((Date.now() - started) / 1000).toFixed(0)}s`

  console.log('Comprehensive Rules: locating the current text file…')
  const rulesUrl = findRulesTextUrl(await fetchText(RULES_PAGE))
  console.log(`  ${rulesUrl}`)
  const parsed = parseComprehensiveRules(await fetchText(rulesUrl))
  console.log(
    `  effective ${parsed.effectiveDate}; ${parsed.rules.get('702')?.children.filter((c) => c.title).length} keyword abilities, ${parsed.rules.get('701')?.children.filter((c) => c.title).length} keyword actions, ${parsed.glossary.size} glossary terms, ${parsed.abilityWords.length} ability words (${elapsed()})`,
  )

  console.log('Scryfall: catalogs…')
  const catalogs: Record<EntryKind, string[]> = {
    'keyword-ability': await scryfallCatalog('keyword-abilities'),
    'keyword-action': await scryfallCatalog('keyword-actions'),
    'ability-word': await scryfallCatalog('ability-words'),
    term: [],
  }
  console.log(
    `  ${catalogs['keyword-ability'].length} keyword abilities, ${catalogs['keyword-action'].length} keyword actions, ${catalogs['ability-word'].length} ability words (${elapsed()})`,
  )

  const drafts = buildDrafts(parsed, catalogs)

  console.log('MTG Wiki: pages…')
  await attachWiki(drafts)
  console.log(`  done (${elapsed()})`)
  const links = linkVariants(drafts, parsed)
  if (links.length > 0) console.log(`  variants linked:\n    ${links.join('\n    ')}`)

  const entries = toEntries(drafts)
  const rules = collectRules(entries, parsed)

  const codex: Codex = {
    generatedAt: new Date().toISOString(),
    comprehensiveRules: { effectiveDate: parsed.effectiveDate, sourceUrl: rulesUrl },
    entries,
    rules,
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true })
  const json = JSON.stringify(codex, null, 2)
  await writeFile(OUTPUT, `${json}\n`)

  const counts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] ?? 0) + 1
    return acc
  }, {})
  console.log(`Wrote ${OUTPUT} (${(json.length / 1024).toFixed(0)} KB, ${elapsed()})`)
  console.log(
    `  entries: ${JSON.stringify(counts)}; rule sections kept: ${Object.keys(rules).length}, omitted as too long: ${
      Object.values(rules)
        .filter((r) => r.omitted)
        .map((r) => r.number)
        .join(', ') || 'none'
    }`,
  )
  const noRules = entries.filter((e) => e.kind !== 'term' && e.ruleNumbers.length === 0)
  if (noRules.length > 0) {
    console.log(`  keyword entries with no rules text: ${noRules.map((e) => e.name).join(', ')}`)
  }
  const noWiki = entries.filter((e) => e.kind !== 'term' && !e.wiki)
  if (noWiki.length > 0) {
    console.log(`  keyword entries with no wiki page: ${noWiki.map((e) => e.name).join(', ')}`)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
