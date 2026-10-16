import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { Camera, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { parseIngredients } from '../lib/parse'
import { analyse } from '../lib/analyze'
import { makeThumbnail, recognise } from '../lib/ocr'
import { lookupBarcode } from '../lib/lookup'
import { SAMPLES, renderSampleLabel } from '../lib/sample'
import { newId, type SavedProduct } from '../lib/storage'
import { matchIngredient } from '../lib/match'
import { Progress } from './ui'
import { Results } from './Results'

interface Item {
  key: string
  text: string
  parent?: string
  noFuzzy?: boolean
}

type OcrState =
  | { kind: 'idle' }
  | { kind: 'running'; status: string; progress: number }
  | { kind: 'done'; confidence: number | null }
  | { kind: 'error'; message: string }

const MAX_BYTES = 20 * 1024 * 1024

const STATUS_LABEL: Record<string, string> = {
  'loading OCR engine': 'Starting OCR engine',
  'loading tesseract core': 'Loading OCR engine',
  'initializing tesseract': 'Initialising',
  'initialized tesseract': 'Initialising',
  'loading language traineddata': 'Downloading language data (first run only)',
  'loaded language traineddata': 'Language data ready',
  'initializing api': 'Preparing',
  'initialized api': 'Preparing',
  'recognizing text': 'Reading the label',
}

interface Props {
  onSave: (p: SavedProduct) => void
  notify: (msg: string) => void
}

export function Scan({ onSave, notify }: Props) {
  const [image, setImage] = useState<string | null>(null)
  const [ocr, setOcr] = useState<OcrState>({ kind: 'idle' })
  const [rawText, setRawText] = useState('')
  const [textDirty, setTextDirty] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [contains, setContains] = useState<string[]>([])
  const [mayContain, setMayContain] = useState<string[]>([])
  const [foundHeader, setFoundHeader] = useState(true)
  const [productName, setProductName] = useState('')
  const [mode, setMode] = useState<'photo' | 'text' | 'barcode'>('photo')
  const [barcode, setBarcode] = useState('')
  const [barcodeBusy, setBarcodeBusy] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const runId = useRef(0)

  const applyText = useCallback((text: string) => {
    const r = parseIngredients(text)
    setItems(r.items.map((i) => ({ key: newId(), text: i.text, parent: i.parent })))
    setContains(r.contains)
    setMayContain(r.mayContain)
    setFoundHeader(r.foundHeader)
    setTextDirty(false)
    setSaved(false)
  }, [])

  const runOcr = useCallback(
    async (url: string) => {
      const id = ++runId.current
      setOcr({ kind: 'running', status: 'loading OCR engine', progress: 0 })
      try {
        const res = await recognise(url, (p) => {
          if (id === runId.current) setOcr({ kind: 'running', status: p.status, progress: p.progress })
        })
        if (id !== runId.current) return
        setRawText(res.text)
        applyText(res.text)
        setOcr({ kind: 'done', confidence: res.confidence })
        if (!res.text.trim()) setOcr({ kind: 'error', message: 'No text was found in this image. Try a sharper, closer photo of the ingredient list.' })
      } catch (e) {
        if (id === runId.current) setOcr({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    },
    [applyText],
  )

  const acceptFile = useCallback(
    (file: File | undefined | null) => {
      setFileError('')
      if (!file) return
      if (!file.type.startsWith('image/')) return setFileError('That file isn’t an image. Upload a JPG, PNG, WebP or HEIC photo.')
      if (file.size > MAX_BYTES) return setFileError('That image is over 20 MB. Try a smaller photo.')
      const url = URL.createObjectURL(file)
      setImage((old) => {
        if (old?.startsWith('blob:')) URL.revokeObjectURL(old)
        return url
      })
      setMode('photo')
      void runOcr(url)
    },
    [runOcr],
  )

  // Paste an image from the clipboard anywhere on the page
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        acceptFile(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [acceptFile])

  const analysis = useMemo(() => analyse(items, contains, mayContain), [items, contains, mayContain])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  const trySample = async (i: number) => {
    const s = SAMPLES[i]
    setProductName(s.name)
    const blob = await renderSampleLabel(s.text)
    acceptFile(new File([blob], 'sample.png', { type: 'image/png' }))
  }

  const doBarcode = async () => {
    setBarcodeError('')
    setBarcodeBusy(true)
    try {
      const p = await lookupBarcode(barcode)
      setProductName([p.brand, p.name].filter(Boolean).join(' – '))
      setImage(p.image ?? null)
      setRawText(p.ingredientsText)
      applyText(p.ingredientsText)
      setOcr({ kind: 'idle' })
      notify('Loaded ingredients from Open Food Facts')
    } catch (e) {
      setBarcodeError(e instanceof Error ? e.message : String(e))
    } finally {
      setBarcodeBusy(false)
    }
  }

  const reset = () => {
    runId.current++
    if (image?.startsWith('blob:')) URL.revokeObjectURL(image)
    setImage(null)
    setOcr({ kind: 'idle' })
    setRawText('')
    setItems([])
    setContains([])
    setMayContain([])
    setProductName('')
    setFileError('')
    setSaved(false)
  }

  const updateItem = (i: number, patch: Partial<Item>) => {
    setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)))
    setSaved(false)
  }
  const removeItem = (i: number) => {
    setItems((list) => list.filter((_, j) => j !== i))
    setSaved(false)
  }
  const addItem = () => {
    const t = newItem.trim()
    if (!t) return
    setItems((list) => [...list, { key: newId(), text: t }])
    setNewItem('')
    setSaved(false)
  }

  const save = async () => {
    const thumb = image ? await makeThumbnail(image) : undefined
    onSave({
      id: newId(),
      name: productName.trim() || `Scan ${new Date().toLocaleDateString()}`,
      savedAt: Date.now(),
      ingredients: items.map((i) => i.text),
      contains,
      mayContain,
      thumb,
    })
    setSaved(true)
  }

  const hasContent = image || rawText || items.length > 0
  const running = ocr.kind === 'running'
  const lowConfidence = ocr.kind === 'done' && ocr.confidence !== null && ocr.confidence < 65

  if (!hasContent) {
    return (
      <div className="landing">
        <div className="hero">
          <h1>Read the label.</h1>
          <p className="lede">
            Take a photo of an ingredient list. IngreLens reads it and tells you what each ingredient is, why it’s in there, and what
            regulators and studies have found, with links so you can check for yourself.
          </p>
          <p className="hero-meta">Free · No account · Photos stay on your device</p>
        </div>

        <div className="capture panel">
          <div className="panel-title">Scan a label</div>
          <div className="text-tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'photo'} className={mode === 'photo' ? 'on' : ''} onClick={() => setMode('photo')}>
              Photo
            </button>
            <button role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>
              Type or paste
            </button>
            <button role="tab" aria-selected={mode === 'barcode'} className={mode === 'barcode' ? 'on' : ''} onClick={() => setMode('barcode')}>
              Barcode
            </button>
          </div>

          {mode === 'photo' && (
            <>
              <div
                className={`dropzone ${dragging ? 'drag' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
              >
                <p className="dz-title">Drop a photo of the ingredient list</p>
                <p className="muted">or click to choose one. Pasting an image works too.</p>
              </div>
              <div className="row gap-s capture-actions">
                <button className="btn primary grow" onClick={() => cameraRef.current?.click()}>
                  <Camera size={17} /> Take a photo
                </button>
                <button className="btn grow" onClick={() => fileRef.current?.click()}>
                  Choose file
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => acceptFile(e.target.files?.[0])} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => acceptFile(e.target.files?.[0])} />
              {fileError && (
                <p className="error-text">
                  <TriangleAlert size={15} /> {fileError}
                </p>
              )}
              <p className="tip">Get close enough that the list fills the frame. Flat, well lit and no glare works best.</p>
            </>
          )}

          {mode === 'text' && (
            <div className="stack">
              <textarea
                className="textarea"
                rows={7}
                placeholder="Ingredients: water, sugar, citric acid, natural flavors…"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <button className="btn primary" disabled={!rawText.trim()} onClick={() => applyText(rawText)}>
                Look up these ingredients
              </button>
            </div>
          )}

          {mode === 'barcode' && (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault()
                void doBarcode()
              }}
            >
              <label className="field">
                <span>Barcode number (EAN / UPC)</span>
                <input inputMode="numeric" placeholder="e.g. 5449000000996" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
              </label>
              <button className="btn primary" disabled={barcodeBusy || barcode.replace(/\D/g, '').length < 6}>
                {barcodeBusy && <LoaderCircle className="spin" size={17} />} Look up product
              </button>
              {barcodeError && (
                <p className="error-text">
                  <TriangleAlert size={15} /> {barcodeError}
                </p>
              )}
              <p className="tip">Looks the product up on Open Food Facts, a free database run by volunteers. Entries can be out of date, so compare with the pack.</p>
            </form>
          )}

          <div className="samples">
            <span className="muted">Or try an example label:</span>
            {SAMPLES.map((s, i) => (
              <button key={s.name} className="link-btn" onClick={() => void trySample(i)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace">
      <div className="ws-head">
        <input
          className="product-name"
          placeholder="Name this product"
          value={productName}
          onChange={(e) => {
            setProductName(e.target.value)
            setSaved(false)
          }}
          aria-label="Product name"
        />
        <div className="row gap-s">
          <button className="btn ghost" onClick={reset}>
            New scan
          </button>
          <button className="btn primary" disabled={!items.length || saved} onClick={() => void save()}>
            {saved ? 'Saved' : 'Save for comparing'}
          </button>
        </div>
      </div>

      <div className="ws-grid">
        <div className="stack">
          {image && (
            <div className="card preview">
              <img src={image} alt="Uploaded ingredient label" />
              {running && <div className="scanline" aria-hidden />}
              <button className="preview-change btn sm" onClick={() => fileRef.current?.click()}>
                Use another photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => acceptFile(e.target.files?.[0])} />
            </div>
          )}
          {running && (
            <div className="card">
              <Progress
                value={ocr.status === 'recognizing text' ? ocr.progress : Math.min(0.15, ocr.progress * 0.15)}
                label={STATUS_LABEL[ocr.status] ?? 'Working'}
              />
              <p className="fine">OCR runs entirely in your browser. The first scan downloads ~10 MB of language data.</p>
            </div>
          )}
          {ocr.kind === 'error' && (
            <div className="card alert">
              <TriangleAlert size={18} />
              <div>
                <p>{ocr.message}</p>
                <div className="row gap-s">
                  {image && (
                    <button className="btn sm" onClick={() => void runOcr(image)}>
                      Try again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {!running && (
            <div className="card">
              <div className="card-head">
                <h3>Recognised text</h3>
                {ocr.kind === 'done' && ocr.confidence !== null && (
                  <span className={`small ${lowConfidence ? 'warn-inline' : 'muted'}`}>{Math.round(ocr.confidence)}% OCR confidence</span>
                )}
              </div>
              {lowConfidence && <p className="warn-text">The scan wasn’t very clear. Compare this text with the label and fix anything that’s wrong.</p>}
              {!foundHeader && items.length > 0 && (
                <p className="warn-text">We couldn’t find the word “Ingredients”, so the whole text was used. Delete anything that isn’t an ingredient.</p>
              )}
              <textarea
                className="textarea mono"
                rows={8}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value)
                  setTextDirty(true)
                }}
                placeholder="Recognised text will appear here. You can also type or paste the ingredient list."
              />
              <button className="btn sm" disabled={!textDirty || !rawText.trim()} onClick={() => applyText(rawText)}>
                Update list from this text
              </button>
            </div>
          )}
        </div>

        <div className="card editor">
          <div className="card-head">
            <h3>Ingredients ({items.length})</h3>
            <span className="muted small">Edit any name to fix it</span>
          </div>
          {running && items.length === 0 && (
            <div className="skeleton-list">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          )}
          {!running && items.length === 0 && <p className="muted">No ingredients extracted yet. Edit the text and re-extract, or add them below.</p>}
          <ol className="edit-list">
            {items.map((it, i) => {
              const st = it.noFuzzy && analysis.matches[i]?.status === 'unknown' ? 'unknown' : analysis.matches[i]?.status
              return (
                <li key={it.key} className={it.parent ? 'child' : ''}>
                  <span className={`dot st-${st}`} title={st === 'exact' || st === 'partial' ? 'Recognised' : st === 'fuzzy' ? 'Possible OCR error' : 'Not recognised'} />
                  <input
                    value={it.text}
                    onChange={(e) => updateItem(i, { text: e.target.value, noFuzzy: false })}
                    aria-label={`Ingredient ${i + 1}`}
                  />
                  <button className="icon-btn" onClick={() => removeItem(i)} aria-label={`Remove ${it.text}`}>
                    <X size={15} />
                  </button>
                </li>
              )
            })}
          </ol>
          <form
            className="add-row"
            onSubmit={(e) => {
              e.preventDefault()
              addItem()
            }}
          >
            <input placeholder="Add a missing ingredient" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
            <button className="btn sm" disabled={!newItem.trim()}>
              Add
            </button>
          </form>
          {newItem.trim().length > 2 && matchIngredient(newItem).primary && (
            <p className="fine">Will match: {matchIngredient(newItem).primary!.name}</p>
          )}
          <div className="legend small">
            <span>
              <i className="dot st-exact" /> recognised
            </span>
            <span>
              <i className="dot st-fuzzy" /> possible OCR error
            </span>
            <span>
              <i className="dot st-unknown" /> not in database
            </span>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div ref={resultsRef}>
          <Results
            analysis={analysis}
            itemKeys={items.map((i) => i.key)}
            onRename={(i, to) => updateItem(i, { text: to })}
            onRejectFuzzy={(i) => updateItem(i, { noFuzzy: true })}
          />
        </div>
      )}
    </div>
  )
}
