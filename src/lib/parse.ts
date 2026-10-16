export interface ParsedItem {
  text: string
  parent?: string
}

export interface ParseResult {
  items: ParsedItem[]
  contains: string[]
  mayContain: string[]
  foundHeader: boolean
}

const HEADER = /\b(?:[il1|]ngr[eé]d[il1]ents?|[il1]ngredlents?|ingred[il1]ents?|zutaten)\s*[:;.\-]?/i
const STOP =
  /\b(?:contains\s*[:;]|contains\s+(?=(?:milk|wheat|soy|eggs?|peanuts?|tree nuts?|fish|shellfish|crustacean|sesame|almonds?|cashews?|hazelnuts?|walnuts?|coconut|gluten)\b)|allergens?\s*(?:info(?:rmation)?)?\s*[:;]|may contain|manufactured (?:in|on|by)|distributed by|produced (?:in|on|by)|processed in|made in a facility|packed in a facility|nutrition facts|best before|best by|store in|keep refrigerated|refrigerate after|for allergens)/i

const FUNCTIONAL_CLASS =
  /^(?:colou?rs?|colou?rings?|preservatives?|antioxidants?|emulsifiers?|stabili[sz]ers?|thickeners?|thickening agents?|gelling agents?|acidity regulators?|acidulants?|acids?|sweeteners?|artificial sweeteners?|leavening(?: agents?)?|raising agents?|flavou?r enhancers?|humectants?|anti-?caking agents?|firming agents?|dough conditioners?|vitamins?(?: and minerals)?|minerals?|vitamins and minerals|spices?|seasonings?|seasoning blend|colou?r added|artificial colou?rs?|natural colou?rs?)$/i

const QUALIFIER =
  /^(?:(?:for|to|as|a|an|added|used|adds|preserves|maintains|retains|helps?)\b.*|colou?r|colou?ring|preservative|antioxidant|emulsifier|vitamin [a-z0-9]+|non-?gmo|organic|dried|natural|artificial|\d+(?:\.\d+)?\s*%.*)$/i

const E_NUMBER = /^e\s?-?\d{3,4}[a-z]?(?:\s*\([iv]+\))?$/i

function normaliseWhitespace(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/([a-z])-\n([a-z])/g, '$1$2')
    .replace(/[‘’]/g, "'")
    .replace(/[[{]/g, '(')
    .replace(/[\]}]/g, ')')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Split on commas/semicolons that are not inside parentheses. */
export function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if ((ch === ',' || ch === ';') && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

export function cleanSegment(seg: string): string {
  let s = seg
    .replace(/[*†‡™®]/g, '')
    .replace(/\bcontains?\s+(?:\d+(?:\.\d+)?\s*%\s+or\s+less|less\s+than\s+\d+(?:\.\d+)?\s*%)\s+of(?:\s+(?:each\s+of\s+)?the\s+following)?\s*:?/gi, '')
    .replace(/\b(?:less\s+than|\d+(?:\.\d+)?\s*%\s+or\s+less\s+of)\s*\d*(?:\.\d+)?\s*%?\s*of\s*:?/gi, '')
    .replace(/\b(?:each\s+of\s+)?the\s+following\s*:?/gi, '')
    .replace(/\(\s*\d+(?:\.\d+)?\s*%\s*\)/g, '')
    .replace(/\b\d+(?:\.\d+)?\s*%/g, '')
  // "Filling: sugar" → "sugar"
  if (s.includes(':') && !/\($/.test(s)) s = s.slice(s.lastIndexOf(':') + 1)
  s = s
    .replace(/^\s*(?:and\/or|and|or|&)\s+/i, '')
    .replace(/\s+(?:and\/or|and|or)\s*$/i, '')
    .replace(/^[\s.\-–—:]+|[\s.\-–—:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return s
}

function parseSegment(seg: string, parent: string | undefined, out: ParsedItem[]) {
  const open = seg.indexOf('(')
  if (open === -1) {
    const t = cleanSegment(seg)
    if (t && t.length > 1) out.push({ text: t, parent })
    return
  }
  const close = seg.lastIndexOf(')')
  const head = cleanSegment(seg.slice(0, open))
  const inner = seg.slice(open + 1, close > open ? close : undefined)
  const tail = close > open ? cleanSegment(seg.slice(close + 1)) : ''
  const innerParts = splitTopLevel(inner).map((p) => p.trim()).filter(Boolean)
  const innerClean = innerParts.map(cleanSegment).filter(Boolean)

  const headIsClass = !head || FUNCTIONAL_CLASS.test(head)
  const innerIsQualifier = innerClean.length <= 1 && (innerClean.length === 0 || QUALIFIER.test(innerClean[0]))
  const innerIsENumber = innerClean.length === 1 && E_NUMBER.test(innerClean[0])

  if (!headIsClass) {
    // "citric acid (E330)" or "salt (for flavor)": the parentheses only describe the head
    if (innerIsQualifier || innerIsENumber) {
      out.push({ text: head + (tail ? ` ${tail}` : ''), parent })
      return
    }
    out.push({ text: head, parent })
    for (const part of innerParts) parseSegment(part, head, out)
  } else {
    // "colour (E150d)" / "emulsifier (soy lecithin)": the inner part is the real ingredient
    if (innerIsQualifier && !innerIsENumber) {
      if (head) out.push({ text: head, parent })
      return
    }
    for (const part of innerParts) parseSegment(part, parent ?? (head || undefined), out)
  }
  if (tail && tail.length > 1) out.push({ text: tail, parent })
}

function listFrom(sentence: string): string[] {
  return sentence
    .replace(/\band\b/gi, ',')
    .split(/[,;/]/)
    .map((s) => s.replace(/[.:]/g, '').replace(/\b(?:traces? of|ingredients?|products?)\b/gi, '').trim())
    .filter((s) => s.length > 1 && s.length < 40)
}

export function parseIngredients(raw: string): ParseResult {
  let text = normaliseWhitespace(raw)
  const header = HEADER.exec(text)
  const foundHeader = !!header
  if (header) text = text.slice(header.index + header[0].length)

  const contains: string[] = []
  const mayContain: string[] = []
  const stop = STOP.exec(text)
  if (stop) {
    const rest = text.slice(stop.index)
    text = text.slice(0, stop.index)
    const c = /\bcontains\s*[:;]?\s*([^.]*)/i.exec(rest)
    if (c) contains.push(...listFrom(c[1]))
    const a = /\ballergens?\s*(?:info(?:rmation)?)?\s*[:;]\s*([^.]*)/i.exec(rest)
    if (a) contains.push(...listFrom(a[1]))
    const m = /\bmay contain\s*:?\s*([^.]*)/i.exec(rest)
    if (m) mayContain.push(...listFrom(m[1]))
  }

  // A full stop followed by a capitalised word at top level usually ends the list
  text = text.replace(/\.\s*$/, '')

  const items: ParsedItem[] = []
  for (const seg of splitTopLevel(text)) {
    if (seg.trim()) parseSegment(seg, undefined, items)
  }

  const seen = new Set<string>()
  const deduped = items.filter((i) => {
    const k = `${i.parent ?? ''}|${i.text.toLowerCase()}`
    if (seen.has(k) || !/[a-z]/i.test(i.text) || i.text.length > 90) return false
    seen.add(k)
    return true
  })

  return {
    items: deduped,
    contains: [...new Set(contains.map((s) => s.toLowerCase()))],
    mayContain: [...new Set(mayContain.map((s) => s.toLowerCase()))],
    foundHeader,
  }
}
