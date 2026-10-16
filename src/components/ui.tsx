import type { ReactNode } from 'react'
import type { Attention, Evidence } from '../data/types'
import { ATTENTION_LABEL } from '../lib/analyze'

export function AttentionBadge({ level }: { level: Attention }) {
  return <span className={`badge att-${level}`}>{ATTENTION_LABEL[level]}</span>
}

const EVIDENCE_LABEL: Record<Evidence, string> = {
  strong: 'Strong evidence',
  moderate: 'Moderate evidence',
  limited: 'Limited evidence',
  mixed: 'Mixed / debated',
}

export function EvidenceBadge({ level }: { level: Evidence }) {
  return (
    <span className={`badge ev ev-${level}`} title="How settled the science is">
      <span className="ev-bars" aria-hidden>
        {[0, 1, 2].map((i) => (
          <i key={i} className={i < { strong: 3, moderate: 2, limited: 1, mixed: 1 }[level] ? 'on' : ''} />
        ))}
      </span>
      {EVIDENCE_LABEL[level]}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-top">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.max(4, value * 100)}%` }} />
      </div>
    </div>
  )
}
