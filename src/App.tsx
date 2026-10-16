import { useEffect, useState } from 'react'
import { BookOpen, GitCompareArrows, Info, ScanLine } from 'lucide-react'
import { Scan } from './components/Scan'
import { Compare } from './components/Compare'
import { Library } from './components/Library'
import { About } from './components/About'
import { loadProducts, persistProducts, type SavedProduct } from './lib/storage'

type Tab = 'scan' | 'compare' | 'library' | 'about'

const TABS: { id: Tab; label: string; icon: typeof ScanLine }[] = [
  { id: 'scan', label: 'Scan', icon: ScanLine },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'about', label: 'About', icon: Info },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('scan')
  const [products, setProducts] = useState<SavedProduct[]>(loadProducts)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const update = (list: SavedProduct[]) => {
    setProducts(list)
    if (!persistProducts(list)) setToast('Couldn’t save in this browser (storage is full or blocked).')
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('scan')} aria-label="IngreLens home">
          <img src="/favicon.svg" alt="" width={30} height={30} />
          <span>
            Ingre<em>Lens</em>
          </span>
        </button>
        <nav className="tabs" aria-label="Main">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? 'on' : ''} aria-label={label} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              <Icon size={17} aria-hidden />
              <span>{label}</span>
              {id === 'compare' && products.length > 0 && <span className="count">{products.length}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {/* Scan stays mounted so switching tabs doesn't lose the current scan */}
        <div hidden={tab !== 'scan'}>
          <Scan
            onSave={(p) => {
              update([p, ...products])
              setToast(`Saved “${p.name}”. Open Compare to see it side by side.`)
            }}
            notify={setToast}
          />
        </div>
        {tab === 'compare' && <Compare products={products} onDelete={(id) => update(products.filter((p) => p.id !== id))} onGoScan={() => setTab('scan')} />}
        {tab === 'library' && <Library />}
        {tab === 'about' && <About />}
      </main>

      <footer className="footer">
        <p>
          IngreLens provides general information from cited public sources — not medical advice. Always check the physical label for allergens.
        </p>
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
