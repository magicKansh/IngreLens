import { useMemo, useState } from 'react'
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
        <div className="summary-main panel">
          <div className="panel-title">Breakdown</div>
          <div className="facts-row big">
            <span>Ingredients</span>
            <strong>{total}</strong>
          </div>
          <div className="facts-row">
            <span>Found in our database</span>
            <strong>
              {analysis.recognised} of {total}
              <span className="muted"> ({coverage}%)</span>
            </strong>
          </div>
          <div className="rule-thick" />
          {ATTENTION_ORDER.map((a) => (
            <div className="facts-row" key={a}>
              <span>
                <i className={`dot att-${a}`} /> {ATTENTION_LABEL[a]}
              </span>
              <strong>{analysis.attention[a]}</strong>
            </div>
          ))}
          <div className="facts-row">
            <span>
              <i className="dot att-unknown" /> Unknown or unsure
            </span>
            <strong>{analysis.unknown + analysis.uncertain}</strong>
          </div>
          <p className="footnote">
            These levels summarise what the linked sources say. They aren’t a safety rating for the product. Ingredients are listed by weight,
            largest first.
          </p>
        </div>

        <div className="summary-side">
          <div className="panel">
            <div className="panel-title sm">Allergens</div>
            {allergenList.length ? (
              <p className="allergen-list">{allergenList.join(', ')}</p>
            ) : (
              <p className="muted">None of the major allergens were found in this list.</p>
            )}
            {analysis.mayContain.length > 0 && <p className="footnote">May contain: {analysis.mayContain.join(', ')}</p>}
            <p className="footnote">Check the pack too. The scan can miss words, and we can’t check ingredients we don’t recognise.</p>
          </div>
          {highlights.length > 0 && (
            <div className="panel">
              <div className="panel-title sm">Also in this list</div>
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
        <div className="text-tabs" role="tablist">
          {(
            [
              ['all', `All (${total})`],
              ['attention', 'Worth noting'],
              ['allergens', 'Allergens'],
              ['unknown', `Unknown (${analysis.unknown + analysis.uncertain})`],
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
