export type Evidence = 'strong' | 'moderate' | 'limited' | 'mixed'

/** How much a typical shopper may want to pay attention. Not a safety verdict. */
export type Attention = 'none' | 'low' | 'moderate' | 'high'

export type Tag =
  | 'added-sugar'
  | 'non-nutritive-sweetener'
  | 'sugar-alcohol'
  | 'synthetic-color'
  | 'preservative'
  | 'emulsifier'
  | 'allergen'
  | 'animal-derived'
  | 'caffeine'
  | 'trans-fat'
  | 'high-sodium'
  | 'nutrient'
  | 'restricted-eu'

export interface Source {
  org: string
  label: string
  url: string
}

export interface IngredientInfo {
  id: string
  name: string
  aliases: string[]
  eNumbers?: string[]
  category: string
  what: string
  purpose: string
  benefits: string[]
  concerns: string[]
  evidence: Evidence
  evidenceNote: string
  regulatory: string
  attention: Attention
  allergen?: string
  tags: Tag[]
  sources: Source[]
}
