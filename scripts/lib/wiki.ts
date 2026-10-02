import type { WikiInfo } from '../../src/lib/codex.ts'

/**
 * Client and parsers for the MTG Wiki's MediaWiki API (https://mtg.wiki/api.php).
 *
 * Each mechanic page opens with an infobox template ({{Infobox keyword}}, {{Infobox action}}
 * or {{Infobox ability}}) carrying structured facts, followed by a lead paragraph. The
 * API returns the lead as plain text; the infobox is parsed from the page's wikitext.
 */

export const WIKI_API = 'https://mtg.wiki/api.php'
const USER_AGENT = 'mtg-codex-ingest/0.1 (https://github.com/Ryanbarker0/mtg-codex)'
/** The extracts module allows at most 20 pages per request. */
const BATCH_SIZE = 20
const REQUEST_GAP_MS = 500

export interface WikiPage {
  /** The title asked for. */
  requested: string
  /** The title the wiki resolved it to, after redirects. */
  title: string
  url: string
  missing: boolean
  disambiguation: boolean
  /** Set when the redirect pointed at a section of another page. */
  fragment?: string
  extract?: string
  wikitext?: string
}

interface ApiResponse {
  query?: {
    redirects?: Array<{ from: string; to: string; tofragment?: string }>
    normalized?: Array<{ from: string; to: string }>
    pages?: Array<{
      title: string
      missing?: boolean
      fullurl?: string
      pageprops?: { disambiguation?: string }
      extract?: string
      revisions?: Array<{ slots: { main: { content: string } } }>
    }>
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchPages(titles: string[]): Promise<WikiPage[]> {
  const results: WikiPage[] = []
  for (let start = 0; start < titles.length; start += BATCH_SIZE) {
    if (start > 0) await sleep(REQUEST_GAP_MS)
    const batch = titles.slice(start, start + BATCH_SIZE)
    const params = new URLSearchParams({
      action: 'query',
      prop: 'extracts|info|pageprops|revisions',
      exintro: '1',
      explaintext: '1',
      exlimit: String(BATCH_SIZE),
      inprop: 'url',
      ppprop: 'disambiguation',
      rvprop: 'content',
      rvslots: 'main',
      redirects: '1',
      titles: batch.join('|'),
      format: 'json',
      formatversion: '2',
    })
    const response = await fetch(`${WIKI_API}?${params}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`MTG Wiki ${response.status}: ${response.statusText}`)
    const body = (await response.json()) as ApiResponse
    results.push(...pagesFromResponse(batch, body))
  }
  return results
}

/** Maps each requested title through normalisation and redirects to its page. */
export function pagesFromResponse(requested: string[], body: ApiResponse): WikiPage[] {
  const normalized = new Map((body.query?.normalized ?? []).map((n) => [n.from, n.to]))
  const redirects = new Map((body.query?.redirects ?? []).map((r) => [r.from, r]))
  const pages = new Map((body.query?.pages ?? []).map((p) => [p.title, p]))

  return requested.map((title) => {
    let resolved = normalized.get(title) ?? title
    let fragment: string | undefined
    // Follow the redirect chain; the API reports each hop.
    for (let hops = 0; hops < 5; hops += 1) {
      const redirect = redirects.get(resolved)
      if (!redirect) break
      resolved = redirect.to
      fragment = redirect.tofragment ?? fragment
    }
    const page = pages.get(resolved)
    if (!page || page.missing) {
      return {
        requested: title,
        title: resolved,
        url: page?.fullurl ?? '',
        missing: true,
        disambiguation: false,
      }
    }
    return {
      requested: title,
      title: page.title,
      url: fragment ? `${page.fullurl}#${encodeFragment(fragment)}` : (page.fullurl ?? ''),
      missing: false,
      disambiguation: page.pageprops?.disambiguation !== undefined,
      fragment,
      extract: page.extract,
      wikitext: page.revisions?.[0]?.slots.main.content,
    }
  })
}

function encodeFragment(fragment: string): string {
  return fragment.replace(/ /g, '_')
}

/**
 * Parses the leading infobox template into a parameter map. Nested templates, links and
 * references can contain "|" and "}}", so the scan tracks brace and bracket depth.
 */
export function parseInfobox(wikitext: string): Record<string, string> | undefined {
  const start = wikitext.search(/\{\{Infobox\b/i)
  if (start === -1) return undefined

  let depth = 0
  let end = -1
  for (let i = start; i < wikitext.length - 1; i += 1) {
    const pair = wikitext.slice(i, i + 2)
    if (pair === '{{') {
      depth += 1
      i += 1
    } else if (pair === '}}') {
      depth -= 1
      i += 1
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  if (end === -1) return undefined

  const inner = wikitext.slice(start + 2, end - 2)
  const parts = splitTopLevel(inner, '|')
  const params: Record<string, string> = {}
  for (const part of parts.slice(1)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const value = cleanWikitext(part.slice(eq + 1))
    if (key && value) params[key] = value
  }
  return params
}

function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = []
  let depthBraces = 0
  let depthBrackets = 0
  let current = ''
  for (let i = 0; i < text.length; i += 1) {
    const pair = text.slice(i, i + 2)
    if (pair === '{{') {
      depthBraces += 1
      current += pair
      i += 1
    } else if (pair === '}}') {
      depthBraces -= 1
      current += pair
      i += 1
    } else if (pair === '[[') {
      depthBrackets += 1
      current += pair
      i += 1
    } else if (pair === ']]') {
      depthBrackets -= 1
      current += pair
      i += 1
    } else if (text[i] === separator && depthBraces === 0 && depthBrackets === 0) {
      parts.push(current)
      current = ''
    } else {
      current += text[i]
    }
  }
  parts.push(current)
  return parts
}

/** Reduces a wikitext fragment to plain text: links to their labels, refs and templates removed. */
export function cleanWikitext(text: string): string {
  let out = text
  out = out.replace(/<ref[^>]*\/>/g, '')
  out = out.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
  out = out.replace(/<br\s*\/?>/gi, '\n')
  out = out.replace(/<!--[\s\S]*?-->/g, '')
  // {{nil|Evergreen}} and similar one-argument templates render their argument.
  out = out.replace(/\{\{(?:nil|nowrap)\|([^{}]*)\}\}/gi, '$1')
  // Any other template is dropped; repeat for nesting.
  for (let i = 0; i < 3; i += 1) out = out.replace(/\{\{[^{}]*\}\}/g, '')
  out = out.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
  out = out.replace(/'''?/g, '')
  out = out.replace(/<[^>]+>/g, '')
  return out
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
    .join('\n')
}

/** Builds the codex's wiki block from a fetched page. */
export function wikiInfoFromPage(page: WikiPage): WikiInfo | undefined {
  if (page.missing || page.disambiguation) return undefined
  const infobox = page.wikitext ? parseInfobox(page.wikitext) : undefined
  const info: WikiInfo = { title: page.title, url: page.url }

  if (page.fragment) {
    // The entry is a section of a broader page. The lead paragraph describes the broader
    // concept, so it is not used as this entry's summary.
    info.sectionOf = page.title
    const alt = infobox && secondaryReminder(infobox, page.fragment)
    if (alt) info.reminder = alt
    return info
  }

  const summary = page.extract?.trim()
  if (summary) info.summary = summary
  if (infobox) {
    if (infobox.reminder) info.reminder = infobox.reminder
    const types = [infobox.type, infobox.type2, infobox.type3].filter(
      (t): t is string => t !== undefined,
    )
    if (types.length > 0) info.abilityType = types.join(' · ')
    if (infobox.first) info.firstSet = infobox.first
  }
  return info
}

/** Infoboxes carry a second variant as name2/reminder2, e.g. Commander Ninjutsu under Ninjutsu. */
function secondaryReminder(infobox: Record<string, string>, fragment: string): string | undefined {
  for (const n of ['2', '3', '4']) {
    const name = infobox[`name${n}`]
    if (name && name.toLowerCase() === fragment.toLowerCase()) return infobox[`reminder${n}`]
  }
  return undefined
}
