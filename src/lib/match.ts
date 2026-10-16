import { INGREDIENTS } from '../data/ingredients'
import type { IngredientInfo } from '../data/types'

export type MatchStatus = 'exact' | 'partial' | 'fuzzy' | 'unknown'

export interface MatchResult {
  input: string
  parent?: string
  status: MatchStatus
  primary?: IngredientInfo
  /** Other entries recognised inside the same phrase, e.g. "milk chocolate" → cocoa + milk. */
  also: IngredientInfo[]
  /** 0–1 similarity for fuzzy matches (OCR typos). */
  score: number
}

export const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const QUALIFIERS =
  /\b(?:organic|certified|non gmo|gmo free|fair trade|fairtrade|pure|fresh|raw|dried|dehydrated|unbleached|bleached|refined|expeller pressed|cold pressed|ground|roasted|toasted|whole|filtered|reconstituted|concentrated|from concentrate|added|naturally|less than|of|contains)\b/g

const stripQualifiers = (s: string) => s.replace(QUALIFIERS, ' ').replace(/\s+/g, ' ').trim()

const aliasIndex = new Map<string, IngredientInfo>()
const eIndex = new Map<string, IngredientInfo>()

for (const ing of INGREDIENTS) {
  for (const a of [ing.name, ...ing.aliases]) {
    const k = normalise(a)
    if (k && !aliasIndex.has(k)) aliasIndex.set(k, ing)
  }
  for (const e of ing.eNumbers ?? []) eIndex.set(e.toLowerCase().replace(/\s/g, ''), ing)
}

const aliasesByLength = [...aliasIndex.keys()].filter((k) => k.length >= 3).sort((a, b) => b.length - a.length)

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

const similarity = (a: string, b: string) => 1 - levenshtein(a, b) / Math.max(a.length, b.length)

function findENumber(raw: string): IngredientInfo | undefined {
  const m = /\be\s?-?(\d{3,4}[a-z]?)\b/i.exec(raw)
  if (!m) return undefined
  const code = `e${m[1].toLowerCase()}`
  return eIndex.get(code) ?? eIndex.get(code.replace(/[a-z]$/, ''))
}

/** Longest-first, non-overlapping search for known aliases inside a phrase. */
function containedMatches(norm: string): IngredientInfo[] {
  let hay = ` ${norm} `
  const found: IngredientInfo[] = []
  for (const alias of aliasesByLength) {
    const needle = ` ${alias} `
    if (hay.includes(needle)) {
      const ing = aliasIndex.get(alias)!
      if (!found.includes(ing)) found.push(ing)
      hay = hay.replace(needle, ' | ')
    }
  }
  return found
}

export function matchIngredient(input: string, parent?: string): MatchResult {
  const base = { input, parent, also: [] as IngredientInfo[], score: 1 }
  const norm = normalise(input)
  if (!norm) return { ...base, status: 'unknown', score: 0 }

  const exact = aliasIndex.get(norm) ?? aliasIndex.get(stripQualifiers(norm))
  if (exact) return { ...base, status: 'exact', primary: exact }

  const byE = findENumber(input)
  if (byE) return { ...base, status: 'exact', primary: byE }

  const contained = containedMatches(stripQualifiers(norm) || norm)
  if (contained.length) {
    return { ...base, status: 'partial', primary: contained[0], also: contained.slice(1) }
  }

  // Fuzzy match for OCR errors ("sodlum benzoate", "xanthon gum")
  const target = stripQualifiers(norm) || norm
  if (target.length >= 4) {
    let best: { alias: string; score: number } | null = null
    for (const alias of aliasIndex.keys()) {
      if (Math.abs(alias.length - target.length) > 3) continue
      const sc = similarity(alias, target)
      if (!best || sc > best.score) best = { alias, score: sc }
    }
    const threshold = target.length <= 6 ? 0.84 : 0.8
    if (best && best.score >= threshold) {
      return { ...base, status: 'fuzzy', primary: aliasIndex.get(best.alias), score: best.score }
    }
  }

  return { ...base, status: 'unknown', score: 0 }
}

export const knownIngredientCount = INGREDIENTS.length
