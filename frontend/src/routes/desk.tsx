import { useState } from 'react'
import { Topbar, useToast } from '../app/shell'
import { MandateRow } from '../app/blocks'
import { useMandates } from '../hooks/useMandates'
import * as Icons from '../app/icons'

export default function Desk() {
  const push = useToast()
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')
  const { data: mandates = [], isLoading } = useMandates()

  const active = mandates.filter(m => ['ARMED', 'EXECUTING', 'TRIGGERED', 'PENDING'].includes(m.statusLabel))

  const filtered = filter === 'all'
    ? mandates
    : filter === 'active'
      ? active
      : mandates.filter(m => m.statusLabel === 'EXECUTED' || m.statusLabel === 'FAILED')

  const sigCount = mandates.reduce((sum, m) => sum + m.signals.length, 0)
  const sigMet = mandates.reduce((sum, m) => sum + m.signals.filter(s => s.triggered).length, 0)

  const submit = () => {
    if (!draft.trim()) { push?.({ kind: 'error', title: 'Enter a thesis first' }); return }
    sessionStorage.setItem('lictor_draft', draft)
    location.hash = '#/create'
  }

  return (
    <>
      <Topbar
        title="Desk"
        sub={`Operating center · ${active.length} active mandate${active.length !== 1 ? 's' : ''}`}
        actions={<a href="#/create" className="btn btn-primary btn-sm"><Icons.Plus size={14} />New mandate</a>}
      />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 1180 }}>

          {/* COMPOSER */}
          <div style={{ marginBottom: 'var(--s8)' }}>
            <div className="row gap2" style={{ marginBottom: 'var(--s4)' }}>
              <Icons.Bolt size={15} style={{ color: 'var(--accent-hi)' }} />
              <span className="label" style={{ color: 'var(--text-mid)' }}>State a new mandate</span>
            </div>
            <div className="composer">
              <textarea className="composer-input" rows={2} value={draft} onChange={e => setDraft(e.target.value)}
                placeholder={'Buy SOMI if Polymarket "BTC > $100k" odds drop below 70% and ETH is above $4,000…'}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }} />
              <div className="composer-bar">
                <span className="tok-pill"><span className="lbl">IN</span>USDC.e</span>
                <Icons.Arrow size={14} style={{ color: 'var(--text-faint)' }} />
                <span className="tok-pill"><span className="lbl">OUT</span>WSOMI</span>
                <div className="grow" />
                <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  <span className="kbd">⌘</span> <span className="kbd">↵</span> to decompose
                </span>
                <button className="btn btn-primary btn-sm" onClick={submit}>Decompose <Icons.Arrow size={13} /></button>
              </div>
            </div>
            <div className="row gap3" style={{ marginTop: 'var(--s3)', flexWrap: 'wrap' }}>
              <span className="mono faint" style={{ fontSize: 11 }}>Try:</span>
              {[
                'Short ETH if recession odds break 60% and ETH < $2,500',
                'Buy WETH if BTC dominance falls under 52%',
              ].map(s => (
                <button key={s} className="chip" onClick={() => setDraft(s)}>{s}</button>
              ))}
            </div>
          </div>

          {/* STATS */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 'var(--s8)' }}>
            <Kpi label="Active mandates" value={active.length.toString()} />
            <Kpi label="Signals monitored" value={sigCount.toString()} sub={`${sigMet} met`} />
            <Kpi label="Total mandates" value={mandates.length.toString()} />
            <Kpi label="Deployed contract" value="v2" sub="Shannon testnet" />
          </div>

          {/* MANDATE LIST */}
          <div className="sec-head">
            <div className="sec-title">
              <h2 className="h3">Mandates</h2>
              <span className="badge">{mandates.length}</span>
            </div>
            <div className="seg">
              {(['all', 'active', 'closed'] as const).map(f => (
                <button key={f} data-on={filter === f} onClick={() => setFilter(f)}>
                  {f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="panel mandate-list">
            {isLoading && (
              <div className="empty">
                <span className="spinner" />
                <span className="muted">Loading mandates…</span>
              </div>
            )}
            {!isLoading && filtered.length === 0 && mandates.length === 0 && (
              <div className="empty">
                <div className="empty-ico"><Icons.Layers size={22} /></div>
                <span className="muted">No active mandates. Set your first trade condition.</span>
                <a href="#/create" className="btn btn-primary btn-sm">New mandate</a>
              </div>
            )}
            {!isLoading && filtered.length === 0 && mandates.length > 0 && (
              <div className="empty">
                <div className="empty-ico"><Icons.Layers size={22} /></div>
                <span className="muted">No mandates match this filter</span>
              </div>
            )}
            {!isLoading && filtered.map(m => (
              <MandateRow key={m.mandateId.toString()} m={m} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'up' }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone === 'up' ? { color: 'var(--up)' } : undefined}>{value}</div>
      {sub && <div className="mono faint" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
