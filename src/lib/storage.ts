export interface SavedProduct {
  id: string
  name: string
  savedAt: number
  ingredients: string[]
  contains?: string[]
  mayContain?: string[]
  thumb?: string
}

const KEY = 'ingrelens.products.v1'

export function loadProducts(): SavedProduct[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function persistProducts(list: SavedProduct[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    // Quota exceeded (thumbnails) — retry without images
    try {
      localStorage.setItem(KEY, JSON.stringify(list.map(({ thumb: _t, ...p }) => p)))
      return true
    } catch {
      return false
    }
  }
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
