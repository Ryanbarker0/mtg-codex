import { describe, expect, it } from 'vitest'
import { cleanWikitext, pagesFromResponse, parseInfobox, wikiInfoFromPage } from './wiki.ts'

const EVOKE = `{{Infobox keyword
| type = Static
| type2 = Triggered
| first = Lorwyn
| last = Alchemy: Lorwyn
| cost = y
| reminder = You may cast this spell for its evoke cost. If you do, it's sacrificed when it enters.
| storm = 5
| storm_ref=<ref>{{EzTumblr|https://markrosewater.tumblr.com/post/1|title=What's evoke on the storm scale?|2022-03-12}}</ref>
| interact = evoke
}}
'''Evoke''' is a [[keyword ability]] that allows a player to pay an [[alternative cost]].`

const NINJUTSU = `{{Infobox keyword
| icon = MTGA Ninjutsu.png
| type = Activated
| first = Betrayers of Kamigawa
| reminder = Return an unblocked attacker you control to hand: Put this card onto the battlefield from your hand tapped and attacking.
| name2 = Commander Ninjutsu
| reminder2 = Return an unblocked attacker you control to hand: Put this card onto the battlefield from your hand or the command zone tapped and attacking.
}}`

const SCRY = `{{Infobox action
| icon = MTGA Scry.png
| first_mech= Alliances
| first = Fifth Dawn
| last = {{nil|Evergreen}}
| reminder = Look at the top N cards of your library, then put any number of them on the bottom and the rest on top in any order.
| N = N
}}`

const LANDFALL = `{{Infobox ability 
| first = Zendikar
| reminder = Whenever a land you control enters, … (nonland permanents)<br>''Landfall'' — If you had a land you control enter this turn, … (instants and sorceries)
| storm_ref = <ref name= "Walk and Fall">{{EzTumblr|https://markrosewater.tumblr.com/post/7|title=It appears |2025-07-03}}</ref>
}}`

describe('parseInfobox', () => {
  it('reads parameters and strips references', () => {
    const box = parseInfobox(EVOKE)
    expect(box).toMatchObject({
      type: 'Static',
      type2: 'Triggered',
      first: 'Lorwyn',
      reminder:
        "You may cast this spell for its evoke cost. If you do, it's sacrificed when it enters.",
      storm: '5',
    })
    expect(box?.storm_ref).toBeUndefined()
  })

  it('handles nested templates and line breaks in values', () => {
    expect(parseInfobox(SCRY)?.last).toBe('Evergreen')
    expect(parseInfobox(LANDFALL)?.reminder).toBe(
      'Whenever a land you control enters, … (nonland permanents)\nLandfall — If you had a land you control enter this turn, … (instants and sorceries)',
    )
  })

  it('returns undefined when there is no infobox', () => {
    expect(parseInfobox("'''Evoke''' is a keyword.")).toBeUndefined()
  })
})

describe('cleanWikitext', () => {
  it('turns links into their labels and drops markup', () => {
    expect(cleanWikitext("'''Evoke''' is a [[keyword ability]] from ''[[Lorwyn|LRW]]''.")).toBe(
      'Evoke is a keyword ability from LRW.',
    )
  })
})

describe('pagesFromResponse', () => {
  const body = {
    query: {
      normalized: [{ from: 'hexproof', to: 'Hexproof' }],
      redirects: [
        { from: 'Forestwalk', to: 'Landwalk' },
        { from: 'Commander ninjutsu', to: 'Ninjutsu', tofragment: 'Commander ninjutsu' },
      ],
      pages: [
        { title: 'Landwalk', fullurl: 'https://mtg.wiki/page/Landwalk', extract: 'Landwalk is…' },
        { title: 'Ninjutsu', fullurl: 'https://mtg.wiki/page/Ninjutsu', extract: 'Ninjutsu is…' },
        { title: 'Hexproof', fullurl: 'https://mtg.wiki/page/Hexproof', extract: 'Hexproof is…' },
        { title: 'Nope', missing: true },
        {
          title: 'Counter',
          fullurl: 'https://mtg.wiki/page/Counter',
          pageprops: { disambiguation: '' },
          extract: 'Counter may refer to:',
        },
      ],
    },
  }
  const pages = pagesFromResponse(
    ['Forestwalk', 'Commander ninjutsu', 'hexproof', 'Nope', 'Counter'],
    body,
  )

  it('follows redirects and normalisation', () => {
    expect(pages[0]).toMatchObject({ requested: 'Forestwalk', title: 'Landwalk', missing: false })
    expect(pages[2]).toMatchObject({ requested: 'hexproof', title: 'Hexproof' })
  })

  it('keeps the section fragment of a redirect in the url', () => {
    expect(pages[1].fragment).toBe('Commander ninjutsu')
    expect(pages[1].url).toBe('https://mtg.wiki/page/Ninjutsu#Commander_ninjutsu')
  })

  it('flags missing and disambiguation pages', () => {
    expect(pages[3].missing).toBe(true)
    expect(pages[4].disambiguation).toBe(true)
  })
})

describe('wikiInfoFromPage', () => {
  it('builds the summary, reminder, type and first set for a direct page', () => {
    const info = wikiInfoFromPage({
      requested: 'Evoke',
      title: 'Evoke',
      url: 'https://mtg.wiki/page/Evoke',
      missing: false,
      disambiguation: false,
      extract: 'Evoke is a keyword ability.',
      wikitext: EVOKE,
    })
    expect(info).toEqual({
      title: 'Evoke',
      url: 'https://mtg.wiki/page/Evoke',
      summary: 'Evoke is a keyword ability.',
      reminder:
        "You may cast this spell for its evoke cost. If you do, it's sacrificed when it enters.",
      abilityType: 'Static · Triggered',
      firstSet: 'Lorwyn',
    })
  })

  it('does not borrow the parent summary for a section, but takes the matching variant reminder', () => {
    const info = wikiInfoFromPage({
      requested: 'Commander ninjutsu',
      title: 'Ninjutsu',
      url: 'https://mtg.wiki/page/Ninjutsu#Commander_ninjutsu',
      missing: false,
      disambiguation: false,
      fragment: 'Commander ninjutsu',
      extract: 'Ninjutsu is a keyword ability.',
      wikitext: NINJUTSU,
    })
    expect(info?.summary).toBeUndefined()
    expect(info?.sectionOf).toBe('Ninjutsu')
    expect(info?.reminder).toContain('from your hand or the command zone')
  })

  it('returns nothing for missing or disambiguation pages', () => {
    const base = { requested: 'X', title: 'X', url: '', disambiguation: false }
    expect(wikiInfoFromPage({ ...base, missing: true })).toBeUndefined()
    expect(wikiInfoFromPage({ ...base, missing: false, disambiguation: true })).toBeUndefined()
  })
})
