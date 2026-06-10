import { usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { parseAbiItem, type Log } from 'viem'
import { Topbar } from '../app/shell'
import { chainCfg } from '../lib/chain'
import * as Icons from '../app/icons'

const mandateSubmittedEvent = parseAbiItem(
  'event MandateSubmitted(uint256 indexed mandateId, address indexed owner, string thesis, address tokenIn, address tokenOut, uint256 amountIn)',
)

type SubmittedLog = Log<bigint, number, false, typeof mandateSubmittedEvent>

export default function Feed() {
  const client = usePublicClient()

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['feed-all-mandates', client?.chain?.id],
    enabled: !!client,
    refetchInterval: 60_000,
    queryFn: async (): Promise<SubmittedLog[]> => {
      if (!client) return []
      const cfg = chainCfg(client.chain?.id)
      const latest = await client.getBlockNumber()
      const result = await client.getLogs({
        address: cfg.lictor,
        event: mandateSubmittedEvent,
        fromBlock: cfg.deployBlock,
        toBlock: latest,
      })
      return [...result].reverse()
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
              <div className="stat-value" style={{ color: 'var(--up)' }}>{logs.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Data source</div>
              <div className="stat-value" style={{ fontSize: 14 }}>on-chain logs</div>
            </div>
          </div>

          <div className="sec-head">
            <div className="sec-title">
              <h2 className="h3">All mandates</h2>
              {logs.length > 0 && <span className="badge" style={{ height: 18, fontSize: 10 }}>{logs.length}</span>}
            </div>
          </div>

          {isLoading && (
            <div className="empty"><span className="spinner" /><span className="muted">Scanning chain…</span></div>
          )}

          {!isLoading && logs.length === 0 && (
            <div className="empty">
              <div className="empty-ico"><Icons.Layers size={22} /></div>
              <span className="muted">No mandates deployed yet. Be the first.</span>
              <a href="#/create" className="btn btn-primary btn-sm">New mandate</a>
            </div>
          )}

          {logs.length > 0 && (
            <div className="panel">
              {logs.map((log, i) => (
                <FeedRow key={i} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function FeedRow({ log }: { log: SubmittedLog }) {
  const args = log.args as {
    mandateId?: bigint
    owner?: string
    thesis?: string
    amountIn?: bigint
  }
  const mandateId = args.mandateId ?? 0n
  const owner = args.owner ?? '0x'
  const thesis = args.thesis ?? ''
  const amountIn = args.amountIn ?? 0n

  const shortOwner = `${owner.slice(0, 6)}…${owner.slice(-4)}`
  const shortThesis = thesis.length > 72 ? thesis.slice(0, 72) + '…' : thesis
  const amountUsdc = Number(amountIn) / 1e6

  return (
    <div
      className="feed-row lrow"
      style={{ gridTemplateColumns: '30px 1fr auto', cursor: 'pointer' }}
      onClick={() => { location.hash = `#/desk` }}
    >
      <div className="feed-ico" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-mid)' }}>
        <Icons.Layers size={14} />
      </div>
      <div className="col" style={{ gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span className="mono" style={{ color: 'var(--accent-hi)' }}>
            LCT-{mandateId.toString().padStart(4, '0')}
          </span>
          {' '}
          <span className="mono faint" style={{ fontSize: 11 }}>{shortOwner}</span>
        </span>
        <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {shortThesis || '(no thesis)'}
        </span>
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 2, flex: 'none' }}>
        {amountIn > 0n && (
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-mid)' }}>
            {amountUsdc.toLocaleString()} USDC.e
          </span>
        )}
        <span className="mono faint" style={{ fontSize: 10.5 }}>
          block {log.blockNumber?.toLocaleString() ?? '…'}
        </span>
      </div>
    </div>
  )
}
