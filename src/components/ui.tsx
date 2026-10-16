import type { ReactNode } from 'react'
import type { Attention, Evidence } from '../data/types'
import { ATTENTION_LABEL } from '../lib/analyze'

export function AttentionBadge({ level }: { level: Attention }) {
  return <span className={`badge att-${level}`}>{ATTENTION_LABEL[level]}</span>
}

const EVIDENCE_LABEL: Record<Evidence, string> = {
  strong: 'strong',
  moderate: 'moderate',
  limited: 'limited',
  mixed: 'mixed, still debated',
}

export function EvidenceBadge({ level }: { level: Evidence }) {
  return (
    <span className="evidence" title="How settled the science is">
      Evidence: <strong>{EVIDENCE_LABEL[level]}</strong>
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
