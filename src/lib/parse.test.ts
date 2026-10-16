import { describe, expect, it } from 'vitest'
import { parseIngredients } from './parse'
import { matchIngredient } from './match'
import { SAMPLES } from './sample'
import { allergenFromText, analyse } from './analyze'

const texts = (raw: string) => parseIngredients(raw).items.map((i) => i.text.toLowerCase())

describe('parseIngredients', () => {
  it('strips header, splits and extracts contains statement', () => {
    const r = parseIngredients(SAMPLES[0].text)
    expect(r.foundHeader).toBe(true)
    expect(r.items.map((i) => i.text.toLowerCase())).toContain('whole grain oats')
    expect(r.items.find((i) => i.text === 'cranberries')?.parent).toBe('dried cranberries')
    expect(r.items.map((i) => i.text.toLowerCase())).toContain('citric acid')
    expect(r.contains).toEqual(['almonds', 'soy'])
  })

  it('handles "contains 2% or less of" and percentages', () => {
    const t = texts('Ingredients: water, sugar (12%), contains 2% or less of: salt, xanthan gum.')
    expect(t).toEqual(['water', 'sugar', 'salt', 'xanthan gum'])
  })

  it('uses inner ingredient for functional class names', () => {
    const t = texts('Ingredients: milk, emulsifier (soy lecithin), colour (E150d), acidity regulator (citric acid, sodium citrate)')
    expect(t).toEqual(['milk', 'soy lecithin', 'e150d', 'citric acid', 'sodium citrate'])
  })

  it('joins OCR line breaks', () => {
    const t = texts('INGREDIENTS: wheat flour, sugar,\nvegetable oil, sodium bicar-\nbonate. May contain: peanuts.')
    expect(t).toEqual(['wheat flour', 'sugar', 'vegetable oil', 'sodium bicarbonate'])
  })

  it('detects may contain', () => {
    const r = parseIngredients('Ingredients: oats, salt. May contain traces of milk and peanuts.')
    expect(r.mayContain).toEqual(['milk', 'peanuts'])
  })
})

describe('allergens', () => {
  it('merges declared and detected allergens without false positives', () => {
    const r = parseIngredients(SAMPLES[0].text)
    expect(analyse(r.items, r.contains).allergens).toEqual(['Soy', 'Tree nuts'])
    expect(allergenFromText('cocoa butter')).toEqual([])
    expect(allergenFromText('coconut milk')).toEqual([])
    expect(allergenFromText('cream of tartar')).toEqual([])
    expect(allergenFromText('whey protein concentrate (milk)')).toEqual(['Milk'])
  })
})

describe('matchIngredient', () => {
  it('matches exact aliases and E-numbers', () => {
    expect(matchIngredient('Soy Lecithin').primary?.name).toBe('Lecithin')
    expect(matchIngredient('E211').primary?.name).toBe('Sodium benzoate')
    expect(matchIngredient('FD&C Yellow No. 5').primary?.name).toBe('Yellow 5')
    expect(matchIngredient('organic cane sugar').status).toBe('exact')
  })

  it('finds contained ingredients', () => {
    const m = matchIngredient('milk chocolate chips')
    const names = [m.primary?.name, ...m.also.map((a) => a.name)]
    expect(names).toContain('Milk')
    expect(names).toContain('Cocoa')
  })

  it('fuzzy-matches OCR typos', () => {
    const m = matchIngredient('sodlum benzoate')
    expect(m.status).toBe('fuzzy')
    expect(m.primary?.name).toBe('Sodium benzoate')
  })

  it('reports unknown honestly', () => {
    expect(matchIngredient('zorblax extract').status).toBe('unknown')
  })

  it('recognises every sample ingredient', () => {
    for (const s of SAMPLES) {
      for (const item of parseIngredients(s.text).items) {
        expect(matchIngredient(item.text).status, item.text).not.toBe('unknown')
      }
    }
  })
})
