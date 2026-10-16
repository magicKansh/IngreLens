import { useMemo, useState } from 'react'
import { GitCompareArrows, Package, ScanLine, Trash2 } from 'lucide-react'
import type { IngredientInfo, Tag } from '../data/types'
import { analyse, entriesOf } from '../lib/analyze'
import type { SavedProduct } from '../lib/storage'

interface Props {
  products: SavedProduct[]
  onDelete: (id: string) => void
  onGoScan: () => void
}

const TAG_ROWS: { tag: Tag; label: string }[] = [
  { tag: 'added-sugar', label: 'Added sugars' },
  { tag: 'non-nutritive-sweetener', label: 'Non-sugar sweeteners' },
  { tag: 'sugar-alcohol', label: 'Sugar alcohols' },
  { tag: 'synthetic-color', label: 'Synthetic colours' },
  { tag: 'preservative', label: 'Preservatives' },
  { tag: 'emulsifier', label: 'Emulsifiers & gums' },
  { tag: 'caffeine', label: 'Caffeine sources' },
  { tag: 'restricted-eu', label: 'Banned / restricted in EU' },
]

const names = (list: IngredientInfo[]) => (list.length ? list.map((i) => i.name).join(', ') : '—')

export function Compare({ products, onDelete, onGoScan }: Props) {
  const [selected, setSelected] = useState<string[]>(() => products.slice(0, 2).map((p) => p.id))

  const chosen = products.filter((p) => selected.includes(p.id))
  const data = useMemo(
    () =>
      chosen.map((p) => {
        const a = analyse(p.ingredients.map((text) => ({ text })), p.contains ?? [], p.mayContain ?? [])
        const ids = new Set(a.matches.flatMap((m) => (m.primary ? [m.primary.id] : [])))
        const high = a.matches.flatMap((m) => (m.primary?.attention === 'high' ? [m.primary] : []))
        const moderate = a.matches.flatMap((m) => (m.primary?.attention === 'moderate' ? [m.primary] : []))
        const allergens = [...new Set([...a.allergens, ...a.declaredAllergens.map((c) => c.replace(/^\w/, (x) => x.toUpperCase()))])]
        return { p, a, ids, high: dedupe(high), moderate: dedupe(moderate), allergens }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected.join(','), products],
  )

  const shared = useMemo(() => {
    if (data.length < 2) return []
    const [first, ...rest] = data
    const all = first.a.matches.flatMap(entriesOf)
    return dedupe(all.filter((e) => rest.every((d) => d.ids.has(e.id))))
  }, [data])

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? [...s.slice(1), id] : [...s, id]))

  if (!products.length) {
    return (
      <div className="empty-state card">
        <div className="empty-icon">
          <GitCompareArrows size={30} />
        </div>
        <h2>Compare products side by side</h2>
        <p className="muted">Scan a label, press “Save to compare”, then scan another. Saved products stay in this browser only.</p>
        <button className="btn primary" onClick={onGoScan}>
          <ScanLine size={18} /> Scan a label
        </button>
      </div>
    )
  }

  const minOf = (vals: number[]) => Math.min(...vals)

  return (
    <div className="compare">
      <div className="page-head">
        <h2>Compare</h2>
        <p className="muted">Pick up to three saved products. Counts are facts about the ingredient lists — not a health score.</p>
      </div>

      <div className="saved-grid">
        {products.map((p) => (
          <div key={p.id} className={`saved ${selected.includes(p.id) ? 'on' : ''}`}>
            <button className="saved-main" onClick={() => toggle(p.id)} aria-label={`Select ${p.name}`} aria-pressed={selected.includes(p.id)}>
              {p.thumb ? <img src={p.thumb} alt="" /> : <span className="saved-ph"><Package size={20} /></span>}
              <span>
                <strong>{p.name}</strong>
                <span className="muted small">
                  {p.ingredients.length} ingredients · {new Date(p.savedAt).toLocaleDateString()}
                </span>
              </span>
              <span className="check" aria-hidden />
            </button>
            <button className="icon-btn" onClick={() => onDelete(p.id)} aria-label={`Delete ${p.name}`}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {data.length >= 2 ? (
        <div className="table-wrap card">
          <table className="cmp">
            <thead>
              <tr>
                <th />
                {data.map((d) => (
                  <th key={d.p.id}>{d.p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Ingredients listed</th>
                {data.map((d) => (
                  <td key={d.p.id} className={d.a.matches.length === minOf(data.map((x) => x.a.matches.length)) ? 'best' : ''}>
                    <span className="num">{d.a.matches.length}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <th>Recognised</th>
                {data.map((d) => (
                  <td key={d.p.id}>
                    {d.a.recognised} of {d.a.matches.length}
                  </td>
                ))}
              </tr>
              <tr>
                <th>High attention</th>
                {data.map((d) => (
                  <td key={d.p.id} className={d.high.length === minOf(data.map((x) => x.high.length)) ? 'best' : ''}>
                    <span className="num">{d.high.length}</span>
                    <span className="list">{names(d.high)}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <th>Worth noting</th>
                {data.map((d) => (
                  <td key={d.p.id} className={d.moderate.length === minOf(data.map((x) => x.moderate.length)) ? 'best' : ''}>
                    <span className="num">{d.moderate.length}</span>
                    <span className="list">{names(d.moderate)}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <th>Allergens</th>
                {data.map((d) => (
                  <td key={d.p.id}>{d.allergens.length ? d.allergens.join(', ') : 'None recognised'}</td>
                ))}
              </tr>
              {TAG_ROWS.map((r) => {
                const lists = data.map((d) => d.a.tagged(r.tag))
                if (lists.every((l) => !l.length)) return null
                return (
                  <tr key={r.tag}>
                    <th>{r.label}</th>
                    {lists.map((l, i) => (
                      <td key={data[i].p.id}>
                        <span className="num">{l.length}</span>
                        <span className="list">{names(l)}</span>
                      </td>
                    ))}
                  </tr>
                )
              })}
              <tr>
                <th>Unique to this product</th>
                {data.map((d) => {
                  const others = data.filter((x) => x !== d)
                  const uniq = dedupe(d.a.matches.flatMap(entriesOf).filter((e) => others.every((o) => !o.ids.has(e.id))))
                  return (
                    <td key={d.p.id}>
                      <span className="list">{names(uniq)}</span>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
          <p className="shared">
            <strong>In all selected:</strong> {names(shared)}
          </p>
          <p className="fine">Green cells mark the lowest count in a row. Fewer flagged ingredients doesn’t automatically mean healthier — amounts and the overall diet matter.</p>
        </div>
      ) : (
        <p className="muted center">Select at least two products to compare.</p>
      )}
    </div>
  )
}

function dedupe(list: IngredientInfo[]): IngredientInfo[] {
  const seen = new Set<string>()
  return list.filter((i) => !seen.has(i.id) && !!seen.add(i.id))
}
