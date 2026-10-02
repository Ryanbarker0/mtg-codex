import { describe, expect, it } from 'vitest'
import {
  isSubsectionTitle,
  parseAbilityWords,
  parseComprehensiveRules,
  referencedRules,
} from './comprehensiveRules.ts'

const FIXTURE = `Magic: The Gathering Comprehensive Rules
 
These rules are effective as of September 25, 2026.
 
Introduction
 
Contents
 
1. Game Concepts
100. General
2. Parts of a Card
207. Text Box
7. Additional Rules
701. Keyword Actions
702. Keyword Abilities
725. The Monarch
Glossary
Credits
 
1. Game Concepts
 
100. General
 
100.1. These Magic rules apply to any Magic game with two or more players.
 
100.1a A two-player game is a game that begins with only two players.
 
2. Parts of a Card
 
207. Text Box
 
207.2c An ability word appears in italics. The ability words are adamant, addendum, council’s dilemma, descend 4, and will of the council.
 
7. Additional Rules
 
701. Keyword Actions
 
701.1. Activate
 
701.1a To activate an activated ability is to put it onto the stack and pay its costs.
 
702. Keyword Abilities
 
702.74. Evoke
 
702.74a Evoke represents two abilities. “Evoke [cost]” means “You may cast this card by paying [cost].”
Example: Mulldrifter has evoke.
Example: A second example.
 
702.75. Hideaway
 
702.75a Hideaway is a triggered ability.
 
702.75b Previously, the rules for the hideaway ability were different.
 
702.138. For Mirrodin!
 
702.138a For Mirrodin! is a triggered ability.
 
725. The Monarch
 
725.1. The monarch is a designation a player can have.
 
725.2. There are two inherent triggered abilities associated with being the monarch.
 
725.2a The first is “At the beginning of your end step, draw a card.”
 
Glossary
 
Abandon
To turn a face-up ongoing scheme card face down. See rule 701.33, “Abandon.”
 
Evoke
A keyword ability that causes a permanent to be sacrificed when it enters the battlefield. See rule 702.74, “Evoke.”
 
Monarch
A designation a player can have. See rule 725, “The Monarch.”
 
Credits
 
Magic: The Gathering Original Game Design: Richard Garfield
`

describe('parseComprehensiveRules', () => {
  const parsed = parseComprehensiveRules(FIXTURE)

  it('reads the effective date', () => {
    expect(parsed.effectiveDate).toBe('September 25, 2026')
  })

  it('builds a tree of sections, subsections and rules', () => {
    const evoke = parsed.rules.get('702.74')
    expect(evoke?.title).toBe('Evoke')
    expect(evoke?.children.map((c) => c.number)).toEqual(['702.74a'])
    expect(evoke?.children[0].text).toContain('Evoke represents two abilities')
    expect(parsed.rules.get('702')?.children.map((c) => c.title)).toEqual([
      'Evoke',
      'Hideaway',
      'For Mirrodin!',
    ])
    expect(parsed.rules.get('7')?.children.map((c) => c.number)).toEqual(['701', '702', '725'])
  })

  it('treats "100.1. These Magic rules..." as a rule and "702.74. Evoke" as a title', () => {
    expect(parsed.rules.get('100.1')?.text).toContain('These Magic rules apply')
    expect(parsed.rules.get('100.1')?.title).toBeUndefined()
    expect(parsed.rules.get('100.1')?.children.map((c) => c.number)).toEqual(['100.1a'])
    expect(parsed.rules.get('725.1')?.text).toContain('The monarch is a designation')
  })

  it('attaches examples to the rule they follow', () => {
    expect(parsed.rules.get('702.74a')?.examples).toEqual([
      'Mulldrifter has evoke.',
      'A second example.',
    ])
    expect(parsed.rules.get('702.75a')?.examples).toBeUndefined()
  })

  it('does not mistake the table of contents for rules', () => {
    // Only one node per number even though headers appear twice in the file.
    expect(parsed.rules.get('702')?.children).toHaveLength(3)
  })

  it('reads the glossary', () => {
    expect(parsed.glossary.get('Evoke')).toBe(
      'A keyword ability that causes a permanent to be sacrificed when it enters the battlefield. See rule 702.74, “Evoke.”',
    )
    expect(parsed.glossary.size).toBe(3)
    expect(parsed.glossary.has('Credits')).toBe(false)
  })

  it('reads the ability words from rule 207.2c', () => {
    expect(parsed.abilityWords).toEqual([
      'adamant',
      'addendum',
      'council’s dilemma',
      'descend 4',
      'will of the council',
    ])
  })
})

describe('isSubsectionTitle', () => {
  it('accepts short titles, including ones ending in an exclamation mark', () => {
    expect(isSubsectionTitle('Evoke')).toBe(true)
    expect(isSubsectionTitle('For Mirrodin!')).toBe(true)
    expect(isSubsectionTitle('Start your engines!')).toBe(true)
    expect(isSubsectionTitle('∞ (Infinity)')).toBe(true)
    expect(isSubsectionTitle('Daybound and Nightbound')).toBe(true)
  })

  it('rejects sentences', () => {
    expect(isSubsectionTitle('These Magic rules apply to any Magic game.')).toBe(false)
    expect(isSubsectionTitle('A rule that ends with a parenthetical (like this one).')).toBe(false)
    expect(isSubsectionTitle('The monarch is a designation a player can have.')).toBe(false)
    expect(isSubsectionTitle('Short. Two sentences (no final stop)')).toBe(false)
  })
})

describe('parseAbilityWords', () => {
  it('returns nothing when the sentence is absent', () => {
    expect(parseAbilityWords('An ability word appears in italics.')).toEqual([])
  })
})

describe('referencedRules', () => {
  it('finds single and multiple references', () => {
    expect(referencedRules('See rule 702.74, “Evoke.”')).toEqual(['702.74'])
    expect(referencedRules('See rules 702.19 and 702.20.')).toEqual(['702.19', '702.20'])
    expect(referencedRules('See rules 601.2b, 601.2f, and 903.')).toEqual([
      '601.2b',
      '601.2f',
      '903',
    ])
    expect(referencedRules('No references here.')).toEqual([])
  })
})
