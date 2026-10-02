import { describe, expect, it } from 'vitest'
import { entryIdFromHash, hashForEntry } from './route'

describe('route', () => {
  it('round-trips an entry id through the hash', () => {
    expect(entryIdFromHash(hashForEntry('council-s-dilemma'))).toBe('council-s-dilemma')
    expect(entryIdFromHash('#/')).toBeNull()
    expect(entryIdFromHash('')).toBeNull()
    expect(entryIdFromHash('#/e/evoke?x=1')).toBe('evoke')
  })
})
