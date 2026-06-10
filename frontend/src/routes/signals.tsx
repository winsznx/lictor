import { useState } from 'react'
import { Topbar } from '../app/shell'
import { AgentChip, fmtSig, fmtThresh, distance } from '../app/ui'
import { SignalCard } from '../app/blocks'
import { useMandates } from '../hooks/useMandates'
import type { DisplaySignal } from '../hooks/useMandates'
import { fmtAgo } from '../lib/utils'
import * as Icons from '../app/icons'

export default function Signals() {
  const { data: mandates = [], isLoading, refetch } = useMandates()
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const all: Array<DisplaySignal & { mandateCode: string; mandateId: string }> = []
  for (const m of mandates) {
    for (const s of m.signals) {
      all.push({ ...s, mandateCode: m.code, mandateId: m.mandateId.toString() })
    }
  }

  const met = all.filter(s => s.triggered).length
  const live = all.filter(s => s.health === 'live').length

  return (
    <>
      <Topbar
        title="Signals"
        sub={`${all.length} monitored · ${met} met`}
        actions={<button className="btn btn-secondary btn-sm" onClick={() => { void refetch() }}><Icons.Refresh size={13} />Refresh</button>}
      />
      <div className="page">
        <div className="page-pad-wide" style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 'var(--s7)' }}>
            <Kpi label="Signals live" value={live} />
            <Kpi label="Conditions met" value={met} tone="up" />
            <Kpi label="Total signals" value={all.length} />
            <Kpi label="Mandates" value={mandates.length} />
          </div>

          <div className="sec-head">
            <div className="sec-title"><h2 className="h3">Live monitors</h2>{all.length > 0 && <span className="pulse-dot" />}</div>
            <div className="seg">
              <button data-on={view === 'grid'} onClick={() => setView('grid')}>Grid</button>
              <button data-on={view === 'table'} onClick={() => setView('table')}>Table</button>
            </div>
          </div>

          {isLoading && (
            <div className="empty"><span className="spinner" /><span className="muted">Loading…</span></div>
          )}
          {!isLoading && all.length === 0 && (
            <div className="empty">
              <div className="empty-ico"><Icons.Signal size={22} /></div>
              <span className="muted">No signals yet — arm a mandate first</span>
              <a href="#/create" className="btn btn-primary btn-sm">New mandate</a>
            </div>
          )}

          {view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--s5)' }}>
              {all.map((s, i) => (
                <a key={i} href={'#/mandate/' + s.mandateId} style={{ display: 'block' }}>
                  <SignalCard s={s} />
                </a>
              ))}
            </div>
          ) : (
            <div className="panel" style={{ overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Signal</th><th>Agent</th><th>Source</th>
                    <th>Current</th><th>Threshold</th><th>Distance</th>
                    <th>Health</th><th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {all.map((s, i) => {
                    const d = distance(s)
                    return (
                      <tr key={i} className="lrow" onClick={() => { location.hash = '#/mandate/' + s.mandateId }}>
                        <td>
                          <span className="row gap2">
                            {s.triggered
                              ? <Icons.CheckCircle size={13} style={{ color: 'var(--up)' }} />
                              : <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--text-faint)' }} />}
                            <span style={{ color: 'var(--text-hi)' }}>{s.source}</span>
                            <span className="mono faint" style={{ fontSize: 10.5 }}>{s.mandateCode}</span>
                          </span>
                        </td>
                        <td><AgentChip agent={s.agent} size={15} showName /></td>
                        <td><span className="mono faint" style={{ fontSize: 11.5 }}>{s.source}</span></td>
                        <td><span className="mono" style={{ color: s.triggered ? 'var(--up)' : 'var(--text-hi)' }}>{fmtSig(s)}</span></td>
                        <td><span className="mono faint">{s.cmpLabel} {fmtThresh(s)}</span></td>
                        <td>
                          <div className="meter" style={{ width: 70 }}>
                            <span style={{ width: (s.triggered ? 100 : Math.round(d * 100)) + '%', background: s.triggered ? 'var(--up)' : 'var(--accent)' }} />
                          </div>
                        </td>
                        <td>
                          {s.health === 'stale'
                            ? <span className="rcp-result" style={{ color: 'var(--down)' }}>stale</span>
                            : <span className="rcp-result" style={{ color: 'var(--up)' }}><span className="pulse-dot up" style={{ width: 5, height: 5 }} />live</span>}
                        </td>
                        <td><span className="mono faint" style={{ fontSize: 11 }}>{fmtAgo(s.lastUpdated)}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'up' }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone === 'up' ? { color: 'var(--up)' } : undefined}>{value}</div>
    </div>
  )
}
