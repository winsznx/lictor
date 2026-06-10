import { useState } from 'react'
import { Topbar } from '../app/shell'
import { AgentChip } from '../app/ui'
import { useMandates } from '../hooks/useMandates'
import type { DisplaySignal, DisplayMandate } from '../hooks/useMandates'
import { receiptUrl } from '../lib/chain'
import { useChainCfg } from '../hooks/useChainCfg'
import { fmtAgo, AGENTS } from '../lib/utils'
import * as Icons from '../app/icons'

type SignalReceipt = {
  requestId: bigint
  signal: DisplaySignal
  mandate: DisplayMandate
}

export default function Receipts() {
  const { data: mandates = [], isLoading } = useMandates()
  const cfg = useChainCfg()
  const [agentFilter, setAgentFilter] = useState('all')
  const [q, setQ] = useState('')

  const receipts: SignalReceipt[] = []
  for (const m of mandates) {
    for (const s of m.signals) {
      if (s.lastRequestId > 0n) {
        receipts.push({ requestId: s.lastRequestId, signal: s, mandate: m })
      }
    }
  }

  const filtered = receipts.filter(r => {
    const agentMatch = agentFilter === 'all' || r.signal.agent === agentFilter
    const qMatch = q === '' || r.requestId.toString().includes(q) || r.mandate.code.toLowerCase().includes(q.toLowerCase())
    return agentMatch && qMatch
  })

  return (
    <>
      <Topbar
        title="Receipts"
        sub={`${receipts.length} agent calls · consensus-finalized`}
        actions={
          <a href={cfg.agentsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <Icons.External size={13} />agents platform
          </a>
        }
      />
      <div className="page">
        <div className="page-pad-wide" style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div className="row gap3 wrap" style={{ marginBottom: 'var(--s5)' }}>
            <div className="row gap2" style={{ flex: '1 1 260px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0 var(--s3)', height: 36 }}>
              <Icons.Search size={15} style={{ color: 'var(--text-lo)' }} />
              <input className="cmd-input" style={{ fontSize: 13 }} placeholder="Search request ID or mandate…"
                value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="seg">
              {(['all', 'json', 'parse'] as const).map(a => (
                <button key={a} data-on={agentFilter === a} onClick={() => setAgentFilter(a)}>
                  {a === 'all' ? 'All agents' : AGENTS[a]?.name ?? a}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="empty"><span className="spinner" /><span className="muted">Loading…</span></div>
          )}
          {!isLoading && receipts.length === 0 && (
            <div className="empty">
              <div className="empty-ico"><Icons.Receipt size={22} /></div>
              <span className="muted">No receipts yet — signals generate receipts after each tick</span>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="panel" style={{ overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Request ID</th><th>Agent</th><th>Mandate</th>
                    <th>Signal</th><th>Updated</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} className="lrow">
                      <td>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>
                          {r.requestId.toString().slice(0, 18)}…
                        </span>
                      </td>
                      <td><AgentChip agent={r.signal.agent} size={16} showName /></td>
                      <td><span className="mono faint" style={{ fontSize: 12 }}>{r.mandate.code}</span></td>
                      <td><span className="mono faint" style={{ fontSize: 11.5 }}>{r.signal.source}</span></td>
                      <td><span className="mono faint" style={{ fontSize: 11 }}>{fmtAgo(r.signal.lastUpdated)}</span></td>
                      <td>
                        <a href={receiptUrl(r.requestId, cfg.chainId)} target="_blank" rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm" style={{ height: 26 }}>
                          <Icons.External size={12} />View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
