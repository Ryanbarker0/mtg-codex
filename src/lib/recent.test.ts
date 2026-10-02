import { beforeEach, describe, expect, it } from 'vitest'
import { RECENT_LIMIT, loadRecent, pushRecent } from './recent'

describe('recent', () => {
  beforeEach(() => localStorage.clear())

  it('starts empty and remembers what was pushed, newest first and without duplicates', () => {
    expect(loadRecent()).toEqual([])
    pushRecent('evoke')
    pushRecent('ninjutsu')
    pushRecent('evoke')
    expect(loadRecent()).toEqual(['evoke', 'ninjutsu'])
  })

  it('keeps only the most recent few', () => {
    for (let i = 0; i < RECENT_LIMIT + 5; i += 1) pushRecent(`e${i}`)
    expect(loadRecent()).toHaveLength(RECENT_LIMIT)
    expect(loadRecent()[0]).toBe(`e${RECENT_LIMIT + 4}`)
  })

  it('ignores garbage in storage', () => {
    localStorage.setItem('mtg-codex:recent', '{not json')
    expect(loadRecent()).toEqual([])
    localStorage.setItem('mtg-codex:recent', '[1, "ok", null]')
    expect(loadRecent()).toEqual(['ok'])
  })
})
