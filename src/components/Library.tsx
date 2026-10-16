import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { INGREDIENTS } from '../data/ingredients'
import { normalise } from '../lib/match'
import { IngredientCard } from './IngredientCard'

export function Library() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')

  const categories = useMemo(() => ['All', ...new Set(INGREDIENTS.map((i) => i.category.split(' (')[0].split(' /')[0]))].sort(), [])

  const list = useMemo(() => {
    const n = normalise(q)
    return INGREDIENTS.filter((i) => cat === 'All' || i.category.startsWith(cat))
      .filter(
        (i) =>
          !n ||
          normalise(i.name).includes(n) ||
          i.aliases.some((a) => normalise(a).includes(n)) ||
          i.eNumbers?.some((e) => e.toLowerCase().includes(n.replace(/\s/g, ''))),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [q, cat])

  return (
    <div className="library">
      <div className="page-head">
        <h2>Ingredient library</h2>
        <p className="muted">
          {INGREDIENTS.length} curated entries covering hundreds of label names and E-numbers. Every entry cites its sources.
        </p>
      </div>
      <div className="lib-controls">
        <label className="search">
          <Search size={18} aria-hidden />
          <input placeholder="Search name, alias or E-number (e.g. E211)" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="ing-list">
        {list.map((i) => (
          <IngredientCard key={i.id} match={{ input: i.name, status: 'exact', primary: i, also: [], score: 1 }} />
        ))}
        {!list.length && <p className="empty">No entries match “{q}”. Unknown ingredients on a scan still get a general-reference lookup.</p>}
      </div>
    </div>
  )
}
