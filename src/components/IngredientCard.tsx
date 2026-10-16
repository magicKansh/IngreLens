import { useEffect, useState } from 'react'
import { ChevronDown, ExternalLink, LoaderCircle } from 'lucide-react'
import type { IngredientInfo } from '../data/types'
import type { MatchResult } from '../lib/match'
import { referenceLinks, wikipediaLookup, type WikiSummary } from '../lib/lookup'
import { AttentionBadge, EvidenceBadge } from './ui'

function Details({ info }: { info: IngredientInfo }) {
  return (
    <div className="ing-details">
      <p className="ing-what">{info.what}</p>
      <div className="ing-grid">
        <div>
          <h4>What it does</h4>
          <p>{info.purpose}</p>
        </div>
        {info.benefits.length > 0 && (
          <div>
            <h4>Potential benefits</h4>
            <ul>{info.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        )}
        {info.concerns.length > 0 && (
          <div>
            <h4>Possible downsides</h4>
            <ul>{info.concerns.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        )}
        <div>
          <h4>What the evidence says</h4>
          <p>{info.evidenceNote}</p>
        </div>
        <div>
          <h4>Regulatory status</h4>
          <p>{info.regulatory}</p>
        </div>
      </div>
      <div className="sources">
        <h4>Sources</h4>
        <ul>
          {info.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                <span className="src-org">{s.org}</span>
                {s.label}
                <ExternalLink size={13} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function UnknownDetails({ term }: { term: string }) {
  const [state, setState] = useState<{ loading: boolean; data: WikiSummary | null; error: boolean }>({ loading: true, data: null, error: false })
  useEffect(() => {
    let live = true
    wikipediaLookup(term)
      .then((data) => live && setState({ loading: false, data, error: false }))
      .catch(() => live && setState({ loading: false, data: null, error: true }))
    return () => {
      live = false
    }
  }, [term])

  return (
    <div className="ing-details">
      <div className="honest-note">
        <p>
          We don’t have a checked entry for <strong>“{term}”</strong>, so we won’t guess at what it does or whether it’s a concern. If it’s a
          scanning mistake, fix it in the ingredient list above.
        </p>
      </div>
      {state.loading && (
        <p className="muted row">
          <LoaderCircle className="spin" size={16} /> Looking for a general reference…
        </p>
      )}
      {state.data && (
        <div className="wiki">
          <h4>
            From Wikipedia: {state.data.title}
          </h4>
          <p>{state.data.extract}</p>
          <p className="fine">This is a general summary, not a health assessment, and the article may not be about this exact ingredient.</p>
          <a href={state.data.url} target="_blank" rel="noopener noreferrer" className="link">
            Read the article <ExternalLink size={13} />
          </a>
        </div>
      )}
      {!state.loading && !state.data && (
        <p className="muted">{state.error ? 'Couldn’t reach Wikipedia right now.' : 'No general reference found.'}</p>
      )}
      <div className="sources">
        <h4>Research it yourself</h4>
        <ul>
          {referenceLinks(term).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                <span className="src-org">{s.org}</span>
                {s.label}
                <ExternalLink size={13} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

interface Props {
  match: MatchResult
  index?: number
  onRename?: (to: string) => void
  onRejectFuzzy?: () => void
  defaultOpen?: boolean
}

export function IngredientCard({ match, index, onRename, onRejectFuzzy, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const info = match.primary
  const level = info?.attention
  return (
    <article className={`ing ${open ? 'open' : ''} ${info ? `lvl-${level}` : 'lvl-unknown'}`}>
      <button className="ing-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {index !== undefined && <span className="ing-index">{String(index + 1).padStart(2, '0')}</span>}
        <span className="ing-title">
          <span className="ing-name">{info ? info.name : match.input}</span>
          <span className="ing-sub">
            {info ? info.category : 'No checked entry'}
            {info && match.input.toLowerCase() !== info.name.toLowerCase() && <> · on label: “{match.input}”</>}
            {match.parent && <> · part of {match.parent}</>}
          </span>
        </span>
        <span className="ing-badges">
          {info?.eNumbers?.[0] && <span className="badge mono">{info.eNumbers[0]}</span>}
          {info?.allergen && <span className="badge allergen">Allergen</span>}
          {match.status === 'fuzzy' && <span className="badge fuzzy">Check spelling</span>}
          {info ? <AttentionBadge level={info.attention} /> : <span className="badge unknown">Not in database</span>}
        </span>
        <ChevronDown className="chev" size={18} aria-hidden />
      </button>
      {open && (
        <div className="ing-body">
          {match.status === 'fuzzy' && info && (
            <div className="fuzzy-note">
              <span>
                “{match.input}” is probably <strong>{info.name}</strong> misread by the scanner. Is that right?
              </span>
              <span className="fuzzy-actions">
                {onRename && (
                  <button className="btn sm" onClick={() => onRename(info.name)}>
                    Yes, fix it
                  </button>
                )}
                {onRejectFuzzy && (
                  <button className="btn sm ghost" onClick={onRejectFuzzy}>
                    No
                  </button>
                )}
              </span>
            </div>
          )}
          {info && (
            <div className="row wrap gap-s">
              <EvidenceBadge level={info.evidence} />
              {match.status === 'partial' && <span className="badge soft">Matched within “{match.input}”</span>}
              {match.also.map((a) => (
                <span key={a.id} className="badge soft">
                  Also contains: {a.name}
                  {a.allergen ? ' (allergen)' : ''}
                </span>
              ))}
            </div>
          )}
          {info ? <Details info={info} /> : <UnknownDetails term={match.input} />}
        </div>
      )}
    </article>
  )
}
