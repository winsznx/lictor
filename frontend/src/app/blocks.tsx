import { fmtAgo, signalDistance } from '../lib/utils'
import type { DisplaySignal, DisplayMandate } from '../hooks/useMandates'
import { StatusBadge, fmtSig, fmtThresh } from './ui'
import * as Icons from './icons'

// ─── Compact signal progress bar ─────────────────────────────────────────────

export function SignalBar({ s }: { s: DisplaySignal }) {
  const d = signalDistance(s.latestValue, s.threshold, s.comparator)
  const col = s.triggered ? 'var(--up)' : d > 0.7 ? 'var(--warn)' : 'var(--accent)'
  return (
    <div className="row gap3" style={{ minWidth: 0 }}>
      <div style={{ width: 16, flex: 'none', display: 'flex', justifyContent: 'center' }}>
        {s.triggered
          ? <Icons.CheckCircle size={14} style={{ color: 'var(--up)' }} />
          : <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--text-faint)' }} />}
      </div>
      <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)', width: 116, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {s.source}
      </span>
      <div className="meter grow" style={{ maxWidth: 120 }}>
        <span style={{ width: (s.triggered ? 100 : Math.round(d * 100)) + '%', background: col }} />
      </div>
      <span className="mono" style={{ fontSize: 11.5, color: s.triggered ? 'var(--up)' : 'var(--text-hi)', whiteSpace: 'nowrap' }}>
        {fmtSig(s)}
      </span>
      <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{s.cmpLabel} {fmtThresh(s)}</span>
    </div>
  )
}

// ─── Full signal card ─────────────────────────────────────────────────────────

export function SignalCard({ s, big }: { s: DisplaySignal; big?: boolean }) {
  const d = signalDistance(s.latestValue, s.threshold, s.comparator)
  const col = s.triggered ? 'var(--up)' : d > 0.7 ? 'var(--warn)' : 'var(--accent-hi)'
  return (
    <div className="panel" style={{ padding: 'var(--s5)', position: 'relative', overflow: 'hidden' }}>
      {s.triggered && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--up)', opacity: 0.7 }} />
      )}
      <div className="row between" style={{ marginBottom: 'var(--s4)', gap: 'var(--s3)' }}>
        <div className="col" style={{ gap: 4, minWidth: 0 }}>
          <span className="row gap2" style={{ minWidth: 0 }}>
            <span className="h4" style={{ fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.source}
            </span>
            {s.triggered
              ? <span className="badge is-armed" style={{ height: 18, flex: 'none' }}><Icons.Check size={10} />met</span>
              : <span className="badge is-pending" style={{ height: 18, flex: 'none' }}><span className="dot" />watching</span>}
          </span>
          <span className="row gap2" style={{ minWidth: 0 }}>
            <span className="mono faint" style={{ fontSize: 10.5, flex: 'none' }}>{s.agent}</span>
            <span className="mono faint" style={{ fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.source}
            </span>
            {s.health === 'stale'
              ? <span className="mono" style={{ fontSize: 10, color: 'var(--down)', flex: 'none' }}>· stale</span>
              : <span className="mono" style={{ fontSize: 10, color: 'var(--up)', flex: 'none' }}>· live</span>}
          </span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 1, flex: 'none' }}>
          <span className="mono" style={{ fontSize: big ? 24 : 20, fontWeight: 500, color: 'var(--text-hi)', letterSpacing: '-0.02em' }}>
            {fmtSig(s)}
          </span>
          <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
            target {s.cmpLabel} {fmtThresh(s)}
          </span>
        </div>
      </div>
      <div className="row between" style={{ marginTop: 'var(--s3)' }}>
        <div className="row gap2">
          <span className="label" style={{ fontSize: 9.5 }}>distance to trigger</span>
        </div>
        <div className="row gap3">
          <div className="meter" style={{ width: 90 }}>
            <span style={{ width: (s.triggered ? 100 : Math.round(d * 100)) + '%', background: col }} />
          </div>
          <span className="mono" style={{ fontSize: 11.5, color: col, width: 40, textAlign: 'right' }}>
            {s.triggered
              ? '0.0%'
              : (Math.abs((s.displayValue - s.displayThreshold) / (s.displayThreshold || 1)) * 100).toFixed(1) + '%'}
          </span>
          <span className="mono faint" style={{ fontSize: 10.5 }}>{fmtAgo(s.lastUpdated)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Mandate row ──────────────────────────────────────────────────────────────

export function MandateRow({ m, onOpen }: { m: DisplayMandate; onOpen?: (m: DisplayMandate) => void }) {
  const trg = m.signals.filter(s => s.triggered).length
  return (
    <div className="mandate-row lrow" onClick={() => onOpen ? onOpen(m) : (location.hash = '#/mandate/' + m.mandateId.toString())}>
      <div className="mr-id col">
        <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-hi)' }}>{m.code}</span>
        <span className="mono faint" style={{ fontSize: 10.5 }}>{m.ageStr}</span>
      </div>
      <div className="mr-status"><StatusBadge status={m.statusLabel} /></div>
      <div className="mr-thesis col" style={{ gap: 5, minWidth: 0, overflow: 'hidden' }}>
        <span style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {m.thesis}
        </span>
        <div className="row gap5" style={{ minWidth: 0, overflow: 'hidden' }}>
          {m.signals.slice(0, 2).map((s, i) => <CompactSig key={i} s={s} />)}
          {m.signals.length === 0 && <span className="mono faint" style={{ fontSize: 11 }}>awaiting decomposition…</span>}
        </div>
      </div>
      <div className="mr-meta">
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
          {trg}/{m.signals.length || '—'} sig
        </span>
        <span className="mono faint" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>
          {m.tokenInSymbol} → {m.tokenOutSymbol}
        </span>
      </div>
      <div className="mr-go">
        <Icons.Chevron size={15} style={{ color: 'var(--text-faint)' }} />
      </div>
    </div>
  )
}

// ─── Compact inline signal ────────────────────────────────────────────────────

export function CompactSig({ s }: { s: DisplaySignal }) {
  return (
    <span className="row gap2" style={{ minWidth: 0, flex: 'none' }}>
      {s.triggered
        ? <Icons.CheckCircle size={12} style={{ color: 'var(--up)', flex: 'none' }} />
        : <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--text-faint)', flex: 'none' }} />}
      <span className="mono" style={{ fontSize: 11, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
        {s.source}
      </span>
      <span className="mono" style={{ fontSize: 11, color: s.triggered ? 'var(--up)' : 'var(--text-hi)', whiteSpace: 'nowrap' }}>
        {fmtSig(s)}
      </span>
      <span className="mono faint" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>
        {s.cmpLabel} {fmtThresh(s)}
      </span>
    </span>
  )
}
