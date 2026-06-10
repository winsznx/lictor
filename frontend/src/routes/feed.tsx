import { usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '../app/shell'
import { chainCfg, tokenSymbol, tokenDecimals } from '../lib/chain'
import { enumerateMandates } from '../hooks/useMandates'
import type { OnChainMandate } from '../hooks/useMandates'
import { fmtAgo } from '../lib/utils'
import * as Icons from '../app/icons'

type FeedItem = { id: bigint; m: OnChainMandate }

export default function Feed() {
  const client = usePublicClient()

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['feed-all-mandates', client?.chain?.id],
    enabled: !!client,
    refetchInterval: 60_000,
    queryFn: async (): Promise<FeedItem[]> => {
      if (!client) return []
      const cfg = chainCfg(client.chain?.id)
      const all = await enumerateMandates(client, cfg.lictor)
      return [...all].reverse() // most recent first
    },
  })

  return (
    <>
      <Topbar
        title="Public feed"
        sub="Every mandate deployed on-chain"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => { void refetch() }}>
            <Icons.Refresh size={13} />Refresh
          </button>
        }
      />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 880 }}>
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 'var(--s7)' }}>
            <div className="stat">
              <div className="stat-label">Mandates deployed</div>
              <div className="stat-value" style={{ color: 'var(--up)' }}>{items.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Data source</div>
              <div className="stat-value" style={{ fontSize: 14 }}>on-chain reads</div>
            </div>
          </div>

          <div className="sec-head">
            <div className="sec-title">
              <h2 className="h3">All mandates</h2>
              {items.length > 0 && <span className="badge" style={{ height: 18, fontSize: 10 }}>{items.length}</span>}
            </div>
          </div>

          {isLoading && (
            <div className="empty"><span className="spinner" /><span className="muted">Scanning chain…</span></div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="empty">
              <div className="empty-ico"><Icons.Layers size={22} /></div>
              <span className="muted">No mandates deployed yet. Be the first.</span>
              <a href="#/create" className="btn btn-primary btn-sm">New mandate</a>
            </div>
          )}

          {items.length > 0 && (
            <div className="panel">
              {items.map(({ id, m }) => (
                <FeedRow key={id.toString()} id={id} m={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function FeedRow({ id, m }: { id: bigint; m: OnChainMandate }) {
  const shortOwner = `${m.owner.slice(0, 6)}…${m.owner.slice(-4)}`
  const shortThesis = m.thesis.length > 72 ? m.thesis.slice(0, 72) + '…' : m.thesis
  const amount = Number(m.amountIn) / Math.pow(10, tokenDecimals(m.tokenIn))

  return (
    <a
      className="feed-row lrow"
      href={`#/mandate/${id.toString()}`}
      style={{ gridTemplateColumns: '30px 1fr auto', cursor: 'pointer', textDecoration: 'none' }}
    >
      <div className="feed-ico" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-mid)' }}>
        <Icons.Layers size={14} />
      </div>
      <div className="col" style={{ gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span className="mono" style={{ color: 'var(--accent-hi)' }}>
            LCT-{id.toString().padStart(4, '0')}
          </span>
          {' '}
          <span className="mono faint" style={{ fontSize: 11 }}>{shortOwner}</span>
        </span>
        <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {shortThesis || '(no thesis)'}
        </span>
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 2, flex: 'none' }}>
        {m.amountIn > 0n && (
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-mid)' }}>
            {amount.toLocaleString()} {tokenSymbol(m.tokenIn)}
          </span>
        )}
        <span className="mono faint" style={{ fontSize: 10.5 }}>
          {fmtAgo(m.createdAt)}
        </span>
      </div>
    </a>
  )
}
