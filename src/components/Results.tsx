import { useMemo, useState } from 'react'
import { Info, ShieldAlert } from 'lucide-react'
import type { Attention, Tag } from '../data/types'
import { ATTENTION_LABEL, ATTENTION_ORDER, type Analysis } from '../lib/analyze'
import { IngredientCard } from './IngredientCard'

type Filter = 'all' | 'attention' | 'allergens' | 'unknown'

const HIGHLIGHTS: { tag: Tag; label: string }[] = [
  { tag: 'added-sugar', label: 'Added sugars' },
  { tag: 'non-nutritive-sweetener', label: 'Non-sugar sweeteners' },
  { tag: 'sugar-alcohol', label: 'Sugar alcohols' },
  { tag: 'synthetic-color', label: 'Synthetic colours' },
  { tag: 'preservative', label: 'Preservatives' },
  { tag: 'emulsifier', label: 'Emulsifiers & gums' },
  { tag: 'caffeine', label: 'Caffeine sources' },
  { tag: 'trans-fat', label: 'Trans-fat sources' },
  { tag: 'restricted-eu', label: 'Banned or restricted in the EU' },
  { tag: 'animal-derived', label: 'Animal-derived' },
]

interface Props {
  analysis: Analysis
  itemKeys: string[]
  onRename: (index: number, to: string) => void
  onRejectFuzzy: (index: number) => void
}

export function Results({ analysis, itemKeys, onRename, onRejectFuzzy }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [sortByAttention, setSortByAttention] = useState(false)
  const total = analysis.matches.length

  const rows = useMemo(() => {
    let r = analysis.matches.map((m, i) => ({ m, i }))
    if (filter === 'attention') r = r.filter(({ m }) => m.primary && (m.primary.attention === 'high' || m.primary.attention === 'moderate'))
    if (filter === 'allergens') r = r.filter(({ m }) => [m.primary, ...m.also].some((e) => e?.allergen))
    if (filter === 'unknown') r = r.filter(({ m }) => m.status === 'unknown' || m.status === 'fuzzy')
    if (sortByAttention) {
      const rank = (a?: Attention) => (a ? ATTENTION_ORDER.indexOf(a) : 4)
      r = [...r].sort((a, b) => rank(a.m.primary?.attention) - rank(b.m.primary?.attention))
    }
    return r
  }, [analysis, filter, sortByAttention])

  const allergenList = [...new Set([...analysis.allergens, ...analysis.declaredAllergens.map((a) => a.replace(/^\w/, (c) => c.toUpperCase()))])]
  const highlights = HIGHLIGHTS.map((h) => ({ ...h, items: analysis.tagged(h.tag) })).filter((h) => h.items.length)
  const coverage = total ? Math.round((analysis.recognised / total) * 100) : 0

  return (
    <div className="results">
      <div className="summary">
        <div className="summary-main card">
          <p className="eyebrow">Label breakdown</p>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-num">{total}</span>
              <span className="stat-label">ingredients</span>
            </div>
            <div className="stat">
              <span className="stat-num">{coverage}%</span>
              <span className="stat-label">recognised</span>
            </div>
            <div className="stat">
              <span className="stat-num">{analysis.attention.high + analysis.attention.moderate}</span>
              <span className="stat-label">worth a closer look</span>
            </div>
          </div>
          <div className="att-bar" aria-label="Attention breakdown">
            {ATTENTION_ORDER.map((a) =>
              analysis.attention[a] ? <span key={a} className={`seg att-${a}`} style={{ flex: analysis.attention[a] }} title={`${ATTENTION_LABEL[a]}: ${analysis.attention[a]}`} /> : null,
            )}
            {analysis.unknown + analysis.uncertain > 0 && <span className="seg att-unknown" style={{ flex: analysis.unknown + analysis.uncertain }} title="Unknown / uncertain" />}
          </div>
          <div className="att-legend">
            {ATTENTION_ORDER.map((a) => (
              <span key={a}>
                <i className={`dot att-${a}`} /> {ATTENTION_LABEL[a]} · {analysis.attention[a]}
              </span>
            ))}
            <span>
              <i className="dot att-unknown" /> Unknown/uncertain · {analysis.unknown + analysis.uncertain}
            </span>
          </div>
          <p className="fine">
            <Info size={13} aria-hidden /> “Attention” is a reading aid based on the cited evidence and regulatory status — not a safety rating or a
            verdict on the product. Ingredients are listed by weight, highest first.
          </p>
        </div>

        <div className="summary-side">
          <div className={`card allergen-card ${allergenList.length ? 'has' : ''}`}>
            <p className="eyebrow">
              <ShieldAlert size={14} aria-hidden /> Allergens
            </p>
            {allergenList.length ? (
              <div className="chips">
                {allergenList.map((a) => (
                  <span className="chip allergen" key={a}>
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">No major allergens recognised in this list.</p>
            )}
            {analysis.mayContain.length > 0 && <p className="fine">May contain: {analysis.mayContain.join(', ')}</p>}
            <p className="fine">Always check the physical label. OCR can miss words, and unrecognised ingredients are not checked.</p>
          </div>
          {highlights.length > 0 && (
            <div className="card">
              <p className="eyebrow">At a glance</p>
              <dl className="glance">
                {highlights.map((h) => (
                  <div key={h.tag}>
                    <dt>{h.label}</dt>
                    <dd>{h.items.map((i) => i.name).join(', ')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="results-toolbar">
        <div className="seg-control" role="tablist">
          {(
            [
              ['all', `All · ${total}`],
              ['attention', 'Worth a look'],
              ['allergens', 'Allergens'],
              ['unknown', `Unknown · ${analysis.unknown + analysis.uncertain}`],
            ] as [Filter, string][]
          ).map(([f, l]) => (
            <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {l}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={sortByAttention} onChange={(e) => setSortByAttention(e.target.checked)} />
          <span>Sort by attention</span>
        </label>
      </div>

      <div className="ing-list">
        {rows.map(({ m, i }) => (
          <IngredientCard
            key={itemKeys[i]}
            match={m}
            index={i}
            onRename={(to) => onRename(i, to)}
            onRejectFuzzy={() => onRejectFuzzy(i)}
          />
        ))}
        {rows.length === 0 && <p className="empty">Nothing in this view.</p>}
      </div>
    </div>
  )
}
