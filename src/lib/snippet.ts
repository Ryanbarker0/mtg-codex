import type { Entry } from './codex'

/** The most useful one-liner available: reminder text, else the glossary, else the wiki. */
export function snippet(entry: Entry): string {
  const text = entry.wiki?.reminder ?? entry.glossary ?? entry.wiki?.summary ?? ''
  return text.split('\n')[0]
}
