export interface WikiSummary {
  title: string
  extract: string
  url: string
}

const cache = new Map<string, Promise<WikiSummary | null>>()

/**
 * Looks up a general-reference summary for an ingredient we have no curated entry for.
 * This is encyclopaedic context only — never a safety evaluation — and is labelled as such in the UI.
 */
export function wikipediaLookup(term: string): Promise<WikiSummary | null> {
  const key = term.toLowerCase()
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const q = new URLSearchParams({
          action: 'query',
          list: 'search',
          srsearch: `${term} food ingredient`,
          srlimit: '1',
          format: 'json',
          origin: '*',
        })
        const s = await fetch(`https://en.wikipedia.org/w/api.php?${q}`)
        if (!s.ok) throw new Error('search failed')
        const hit = (await s.json())?.query?.search?.[0]?.title as string | undefined
        if (!hit) return null
        const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit)}`)
        if (!r.ok) return null
        const j = await r.json()
        if (j.type === 'disambiguation' || !j.extract) return null
        return {
          title: j.title as string,
          extract: j.extract as string,
          url: (j.content_urls?.desktop?.page as string) ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(hit)}`,
        }
      })().catch((e) => {
        cache.delete(key)
        throw e
      }),
    )
  }
  return cache.get(key)!
}

export const referenceLinks = (term: string) => [
  { org: 'PubChem', label: 'Search PubChem', url: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(term)}` },
  { org: 'Open Food Facts', label: 'Ingredient on Open Food Facts', url: `https://world.openfoodfacts.org/ingredient/${encodeURIComponent(term.toLowerCase().replace(/\s+/g, '-'))}` },
  { org: 'PubMed', label: 'Search research on PubMed', url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}` },
  { org: 'EFSA', label: 'Search EFSA', url: `https://www.efsa.europa.eu/en/search?s=${encodeURIComponent(term)}` },
]

export interface OffProduct {
  name: string
  brand?: string
  ingredientsText: string
  image?: string
}

/** Open Food Facts: free, open product database with CORS enabled. */
export async function lookupBarcode(code: string): Promise<OffProduct> {
  const clean = code.replace(/\D/g, '')
  if (clean.length < 6) throw new Error('Enter a valid barcode (EAN/UPC digits).')
  const fields = 'product_name,product_name_en,brands,ingredients_text,ingredients_text_en,image_front_small_url'
  let res: Response
  try {
    res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${fields}`)
  } catch {
    throw new Error('Could not reach Open Food Facts. Check your connection.')
  }
  const j = await res.json().catch(() => null)
  if (!j || j.status !== 1 || !j.product) throw new Error('That barcode is not in Open Food Facts yet. Try scanning the label instead.')
  const p = j.product
  const ingredientsText: string = p.ingredients_text_en || p.ingredients_text || ''
  if (!ingredientsText.trim()) throw new Error('Open Food Facts has this product but no ingredient list. Try scanning the label.')
  return {
    name: p.product_name_en || p.product_name || `Product ${clean}`,
    brand: p.brands?.split(',')[0]?.trim(),
    ingredientsText,
    image: p.image_front_small_url,
  }
}
