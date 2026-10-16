import type { Attention, IngredientInfo, Tag } from '../data/types'
import { matchIngredient, type MatchResult } from './match'

export interface Analysis {
  matches: MatchResult[]
  recognised: number
  unknown: number
  uncertain: number
  attention: Record<Attention, number>
  allergens: string[]
  declaredAllergens: string[]
  mayContain: string[]
  tagged: (tag: Tag) => IngredientInfo[]
}

export const ATTENTION_ORDER: Attention[] = ['high', 'moderate', 'low', 'none']

export const ATTENTION_LABEL: Record<Attention, string> = {
  high: 'Notable concern',
  moderate: 'Worth noting',
  low: 'Minor note',
  none: 'No known concern',
}

export function entriesOf(m: MatchResult): IngredientInfo[] {
  return m.primary ? [m.primary, ...m.also] : []
}

/** Words that reveal a major allergen even when the matched entry doesn't (e.g. "soy lecithin", "whey from milk"). */
const ALLERGEN_WORDS: [RegExp, string][] = [
  [/\bsoy|\bsoya\b/i, 'Soy'],
  [
    /(?<!(?:coconut|oat|almond|soy|rice|cashew|hemp|pea) )\bmilk\b|(?<!non-)\bdairy\b|\bwhey\b|\bcasein|\blactose\b|(?<!(?:cocoa|cacao|shea|peanut|nut|almond|cashew|apple|seed|sunflower) )\bbutter\b|(?<!coconut )\bcream\b(?! of tartar)|\bcheese\b/i,
    'Milk',
  ],
  [/\bwheat\b|\bgluten\b|\bspelt\b|\bsemolina\b|\bdurum\b/i, 'Wheat / gluten'],
  [/\beggs?\b/i, 'Egg'],
  [/\bpeanuts?\b/i, 'Peanut'],
  [/\balmonds?\b|\bcashews?\b|\bwalnuts?\b|\bhazelnuts?\b|\bpecans?\b|\bpistachios?\b|\bmacadamia\b|\btree nuts?\b|\bbrazil nuts?\b/i, 'Tree nuts'],
  [/\bsesame\b|\btahini\b/i, 'Sesame'],
  [/\bfish\b|\banchov/i, 'Fish'],
  [/\bshrimp\b|\bcrab\b|\blobster\b|\bprawns?\b|\bcrustacean|\bshellfish\b/i, 'Shellfish'],
]

export const allergenFromText = (text: string) => ALLERGEN_WORDS.filter(([re]) => re.test(text)).map(([, name]) => name)

export function analyse(
  items: { text: string; parent?: string; noFuzzy?: boolean }[],
  contains: string[] = [],
  mayContain: string[] = [],
): Analysis {
  const matches = items.map((i): MatchResult => {
    const m = matchIngredient(i.text, i.parent)
    return i.noFuzzy && m.status === 'fuzzy' ? { ...m, status: 'unknown', primary: undefined, score: 0 } : m
  })
  const attention: Record<Attention, number> = { high: 0, moderate: 0, low: 0, none: 0 }
  const allergenSet = new Set<string>()
  const counted = new Set<string>()
  for (const m of matches) {
    if (m.primary && !counted.has(m.primary.id)) {
      counted.add(m.primary.id)
      attention[m.primary.attention]++
    }
    for (const e of entriesOf(m)) if (e.allergen) allergenSet.add(e.allergen)
    for (const a of allergenFromText(m.input)) allergenSet.add(a)
  }
  for (const c of contains) for (const a of allergenFromText(c)) allergenSet.add(a)
  const declaredUnmapped = contains.filter((c) => allergenFromText(c).length === 0)
  const recognisedIds = new Set(matches.flatMap((m) => entriesOf(m).map((e) => e.id)))
  const all = matches.flatMap(entriesOf)
  return {
    matches,
    recognised: matches.filter((m) => m.status === 'exact' || m.status === 'partial').length,
    unknown: matches.filter((m) => m.status === 'unknown').length,
    uncertain: matches.filter((m) => m.status === 'fuzzy').length,
    attention,
    allergens: [...allergenSet].sort(),
    declaredAllergens: declaredUnmapped,
    mayContain,
    tagged: (tag) => {
      const seen = new Set<string>()
      return all.filter((e) => e.tags.includes(tag) && !seen.has(e.id) && seen.add(e.id) && recognisedIds.has(e.id))
    },
  }
}
