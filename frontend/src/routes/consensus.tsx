import { Topbar } from '../app/shell'
import { AgentChip } from '../app/ui'
import { useMandates } from '../hooks/useMandates'
import { receiptUrl } from '../lib/chain'
import { useChainCfg } from '../hooks/useChainCfg'
import * as Icons from '../app/icons'

export default function AgentLogs() {
  const { data: mandates = [], isLoading, refetch } = useMandates()
  const cfg = useChainCfg()

  type LogRow = {
    mandateCode: string
    mandateId: bigint
    agent: 'json' | 'parse'
    requestId: bigint
    receiptHref: string
    sigIdx: number
  }

  const rows: LogRow[] = []
  for (const m of mandates) {
    for (const s of m.signals) {
      if (s.lastRequestId > 0n) {
        rows.push({
          mandateCode: m.code,
          mandateId: m.mandateId,
          agent: s.agent,
          sigIdx: s.idx,
          requestId: s.lastRequestId,
          receiptHref: receiptUrl(s.lastRequestId, cfg.chainId),
        })
      }
    }
  }

  return (
    <>
      <Topbar
        title="Agent Logs"
        sub="Every AI decision, on-chain, auditable."
        actions={<button className="btn btn-secondary btn-sm" onClick={() => { void refetch() }}><Icons.Refresh size={13} />Refresh</button>}
      />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 1100 }}>

          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 'var(--s7)' }}>
            <div className="stat">
              <div className="stat-label">Total logs</div>
              <div className="stat-value">{rows.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Mandates tracked</div>
              <div className="stat-value">{mandates.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Audit trail</div>
              <div className="stat-value" style={{ fontSize: 14, color: 'var(--up)' }}>on-chain</div>
            </div>
          </div>

          {isLoading && (
            <div className="empty"><span className="spinner" /><span className="muted">Loading…</span></div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="empty">
              <div className="empty-ico"><Icons.Receipt size={22} /></div>
              <span className="muted">No agent logs yet — arm a mandate to generate receipts</span>
              <a href="#/create" className="btn btn-primary btn-sm">New mandate</a>
            </div>
          )}

          {rows.length > 0 && (
            <div className="panel" style={{ overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Mandate</th>
                    <th>Agent</th>
                    <th>Signal</th>
                    <th>Request ID</th>
                    <th style={{ textAlign: 'right' }}>Audit log</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <a href={`#/mandate/${r.mandateId.toString()}`} className="mono" style={{ color: 'var(--accent-hi)', fontSize: 12 }}>
                          {r.mandateCode}
                        </a>
                      </td>
                      <td><AgentChip agent={r.agent} size={15} showName /></td>
                      <td><span className="mono faint" style={{ fontSize: 11.5 }}>sig {r.sigIdx}</span></td>
                      <td>
                        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>
                          {r.requestId.toString().length > 16
                            ? r.requestId.toString().slice(0, 8) + '…' + r.requestId.toString().slice(-6)
                            : r.requestId.toString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a
                          href={r.receiptHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11 }}
                        >
                          Audit log <Icons.External size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && (
            <div className="row gap3" style={{ marginTop: 'var(--s7)', padding: 'var(--s5)', background: 'var(--surface-1)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <Icons.Shield size={18} style={{ color: 'var(--accent-hi)', flex: 'none' }} />
              <div className="col" style={{ gap: 4 }}>
                <span className="h4" style={{ fontSize: 13 }}>Why these receipts are trustworthy</span>
                <span className="muted sm" style={{ lineHeight: 1.55 }}>
                  Each request ID points to a finalized consensus receipt on the Somnia Agents platform. The model runs at temperature 0 with fixed seeds — every validator in the subcommittee computes the identical output. Finalization requires byte-level agreement, not an average.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
