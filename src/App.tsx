import { useEffect, useState } from 'react'
import { Scan } from './components/Scan'
import { Compare } from './components/Compare'
import { Library } from './components/Library'
import { About } from './components/About'
import { loadProducts, persistProducts, type SavedProduct } from './lib/storage'

type Tab = 'scan' | 'compare' | 'library' | 'about'

const TABS: { id: Tab; label: string }[] = [
  { id: 'scan', label: 'Scan' },
  { id: 'compare', label: 'Compare' },
  { id: 'library', label: 'Library' },
  { id: 'about', label: 'About' },
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
          IngreLens
        </button>
        <nav className="nav" aria-label="Main">
          {TABS.map(({ id, label }) => (
            <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              {label}
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
              setToast(`Saved “${p.name}”. You can compare it in the Compare tab.`)
            }}
            notify={setToast}
          />
        </div>
        {tab === 'compare' && <Compare products={products} onDelete={(id) => update(products.filter((p) => p.id !== id))} onGoScan={() => setTab('scan')} />}
        {tab === 'library' && <Library />}
        {tab === 'about' && <About />}
      </main>

      <footer className="footer">
        <p>General information from public sources, not medical advice. Check the pack for allergens.</p>
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
