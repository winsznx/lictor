import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAccount, usePublicClient, useWatchContractEvent, useWriteContract } from 'wagmi'
import { formatEther } from 'viem'
import { lictorAbi } from '../lib/abi'
import { explorerAddress, receiptUrl } from '../lib/chain'
import { useChainCfg } from '../hooks/useChainCfg'
import { fmtAgo, fmtNum } from '../lib/utils'
import { useMandate } from '../hooks/useMandates'
import { useSignals } from '../hooks/useSignals'
import { Topbar, useToast } from '../app/shell'
import { StatusBadge, CopyBtn, ConsensusViz, TokenPair } from '../app/ui'
import { SignalCard } from '../app/blocks'
import * as Icons from '../app/icons'

type MandateDetailProps = { id: string }

export default function MandateDetail({ id }: MandateDetailProps) {
  const mandateId = BigInt(id.replace(/^0+/, '') || '0')
  const push = useToast()
  const cfg = useChainCfg()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const { data: m, isLoading, refetch } = useMandate(mandateId)
  const { signals, isLoading: sigLoading } = useSignals(mandateId)
  const [amountOut, setAmountOut] = useState<bigint | null>(null)
  const [failReason, setFailReason] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  const isOwner = !!address && !!m && address.toLowerCase() === m.owner.toLowerCase()
  const canClose = isOwner && (m?.statusLabel === 'ARMED' || m?.statusLabel === 'FAILED')

  const handleClose = async () => {
    if (!publicClient) return
    try {
      setClosing(true)
      const tx = await writeContractAsync({
        address: cfg.lictor, abi: lictorAbi, functionName: 'closeMandate', args: [mandateId],
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
      push?.({ kind: 'success', title: 'Mandate closed', body: 'Budget and tokens refunded to your wallet' })
      setTimeout(() => { location.hash = '#/desk' }, 800)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      push?.({ kind: 'error', title: 'Close failed', body: msg.slice(0, 140) })
    } finally {
      setClosing(false)
    }
  }

  useWatchContractEvent({
    address: cfg.lictor,
    abi: lictorAbi,
    eventName: 'MandateArmed',
    args: { mandateId },
    onLogs() {
      push?.({ kind: 'info', title: 'Mandate armed', body: 'Signals attached — monitoring active' })
      void refetch()
    },
  })

  useWatchContractEvent({
    address: cfg.lictor,
    abi: lictorAbi,
    eventName: 'MandateExecuted',
    args: { mandateId },
    onLogs(logs) {
      const log = logs[0]
      const out = (log?.args as { amountOut?: bigint }).amountOut
      if (out !== undefined) setAmountOut(out)
      push?.({ kind: 'success', title: 'Trade executed', body: out !== undefined ? `${formatEther(out)} WSOMI received` : undefined })
      void refetch()
    },
  })

  useWatchContractEvent({
    address: cfg.lictor,
    abi: lictorAbi,
    eventName: 'MandateFailed',
    args: { mandateId },
    onLogs(logs) {
      const log = logs[0]
      const reason = (log?.args as { reason?: string }).reason ?? 'Unknown failure'
      setFailReason(reason)
      push?.({ kind: 'error', title: 'Mandate failed', body: reason.slice(0, 100) })
      void refetch()
    },
  })

  if (isLoading) {
    return (
      <div className="page">
        <div className="empty" style={{ marginTop: 'var(--s12)' }}>
          <span className="spinner" />
          <span className="muted">Loading mandate…</span>
        </div>
      </div>
    )
  }

  if (!m) {
    return (
      <>
        <Topbar title={`LCT-${id}`} />
        <div className="page">
          <div className="empty">
            <div className="empty-ico"><Icons.X size={20} /></div>
            <span className="muted">Mandate {id} not found</span>
            <a href="#/desk" className="btn btn-secondary btn-sm">Back to desk</a>
          </div>
        </div>
      </>
    )
  }

  const trg = signals.filter(s => s.triggered).length

  return (
    <>
      <Topbar
        title={
          <span className="row gap3">
            <a href="#/desk" className="mono" style={{ color: 'var(--text-lo)', fontSize: 13 }}>desk</a>
            <span className="faint">/</span>
            <span className="mono">{m.code}</span>
          </span>
        }
        actions={
          <>
            <a
              href={explorerAddress(cfg.lictor, cfg.chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              <Icons.External size={14} />View contract
            </a>
            <a href="#/consensus" className="btn btn-secondary btn-sm"><Icons.Nodes size={14} />Agent Logs</a>
          </>
        }
      />
      <div className="page">
        <div className="page-pad-wide" style={{ maxWidth: 1320, margin: '0 auto' }}>

          {/* HEADER */}
          <div className="row between wrap" style={{ gap: 'var(--s5)', marginBottom: 'var(--s7)' }}>
            <div className="col" style={{ gap: 'var(--s4)', maxWidth: 680 }}>
              <div className="row gap3">
                <StatusBadge status={m.statusLabel} />
                <span className="mono faint" style={{ fontSize: 12 }}>{m.code}</span>
                <span className="mono faint" style={{ fontSize: 12 }}>· created {fmtAgo(m.createdAt)}</span>
              </div>
              <h1 className="h2" style={{ fontWeight: 560, lineHeight: 1.25, letterSpacing: '-0.018em' }}>{m.thesis}</h1>
            </div>
            <div className="row gap3">
              {m.statusLabel === 'EXECUTING' && (
                <span className="btn btn-primary btn-sm">
                  <span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />Executing
                </span>
              )}
              {canClose && (
                <button className="btn btn-secondary btn-sm" onClick={handleClose} disabled={closing}>
                  {closing
                    ? <><span className="spinner" style={{ width: 12, height: 12 }} />Closing…</>
                    : <><Icons.X size={13} />Close & refund</>}
                </button>
              )}
            </div>
          </div>

          {/* SUMMARY STRIP */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 'var(--s7)' }}>
            <SumCell label="Trade" value={<TokenPair inT={m.tokenInSymbol} outT={m.tokenOutSymbol} />} />
            <SumCell label="Amount" value={<span className="mono">{fmtNum(Number(m.amountIn) / 1e6)} USDC.e</span>} />
            <SumCell label="Budget" value={<span className="mono">{parseFloat(formatEther(m.budgetWei)).toFixed(2)} {cfg.symbol}</span>} />
            <SumCell label="Signals" value={<span className="mono">{trg}/{signals.length} met</span>} />
            {amountOut != null
              ? <SumCell label="Received" value={<span className="mono" style={{ color: 'var(--up)' }}>{parseFloat(formatEther(amountOut)).toFixed(4)} WSOMI</span>} />
              : failReason
                ? <SumCell label="Failure" value={<span className="mono" style={{ color: 'var(--down)', fontSize: 11 }}>{failReason.slice(0, 24)}…</span>} />
                : <SumCell label="Status" value={<StatusBadge status={m.statusLabel} />} />}
          </div>

          <div className="row gap6" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* LEFT: Signals */}
            <div style={{ flex: '1 1 540px', minWidth: 0 }}>
              <div className="sec-head">
                <div className="sec-title">
                  <h2 className="h3">Signals</h2>
                  {(m.statusLabel === 'ARMED' || m.statusLabel === 'TRIGGERED') && <span className="pulse-dot" />}
                </div>
                <a href="#/signals" className="mono faint" style={{ fontSize: 11 }}>monitor →</a>
              </div>
              <div className="col gap4">
                {sigLoading && (
                  <div className="panel">
                    <div className="empty" style={{ padding: 'var(--s7)' }}>
                      <span className="spinner" /><span className="muted sm">Loading signals…</span>
                    </div>
                  </div>
                )}
                {!sigLoading && signals.length === 0 && (
                  <div className="panel">
                    <div className="empty" style={{ padding: 'var(--s7)' }}>
                      <span className="spinner" /><span className="muted sm">Awaiting decomposition…</span>
                    </div>
                  </div>
                )}
                {signals.map((s, i) => <SignalCard key={i} s={s} />)}
              </div>
            </div>

            {/* RIGHT: Receipts + consensus */}
            <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>

              {/* Consensus */}
              <div>
                <div className="sec-head"><div className="sec-title"><h2 className="h3">Consensus layer</h2></div></div>
                <div className="panel" style={{ padding: 'var(--s6)' }}>
                  <ConsensusViz value={signals.length ? trg / signals.length : 0} validators={3} size="sm" />
                  <div className="divider" style={{ margin: 'var(--s5) 0' }} />
                  <div className="row between"><span className="label">Mechanism</span><span className="mono faint" style={{ fontSize: 11 }}>temp 0 · fixed seed</span></div>
                  <div className="row between" style={{ marginTop: 8 }}><span className="label">Subcommittee</span><span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>3 validators</span></div>
                </div>
              </div>

              {/* Signal receipts */}
              {signals.some(s => s.lastRequestId > 0n) && (
                <div>
                  <div className="sec-head">
                    <div className="sec-title"><h2 className="h3">Receipts</h2></div>
                    <a href="#/receipts" className="mono faint" style={{ fontSize: 11 }}>all →</a>
                  </div>
                  <div className="panel">
                    {signals.filter(s => s.lastRequestId > 0n).map((s, i) => (
                      <a
                        key={i}
                        href={receiptUrl(s.lastRequestId, cfg.chainId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="feed-row lrow"
                        style={{ gridTemplateColumns: '30px 1fr auto', textDecoration: 'none' }}
                      >
                        <div className="feed-ico" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-mid)' }}>
                          <Icons.Receipt size={14} />
                        </div>
                        <div className="col" style={{ gap: 1 }}>
                          <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>
                            {s.lastRequestId.toString().slice(0, 18)}…
                          </span>
                          <span className="mono faint" style={{ fontSize: 10.5 }}>
                            Signal {s.idx} · {s.agent} · {s.source}
                          </span>
                        </div>
                        <Icons.External size={13} style={{ color: 'var(--text-faint)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Validators */}
              <div>
                <div className="sec-head"><div className="sec-title"><h2 className="h3">Validators</h2></div></div>
                <div className="panel" style={{ padding: 'var(--s5)' }}>
                  <dl className="kv" style={{ gridTemplateColumns: '120px 1fr' }}>
                    <dt>Subcommittee</dt><dd className="mono" style={{ fontSize: 12 }}>3 validators / request</dd>
                    <dt>Consensus</dt><dd className="mono" style={{ fontSize: 12 }}>2-of-3 threshold</dd>
                    <dt>Determinism</dt><dd className="mono" style={{ fontSize: 12 }}>temp 0 · fixed seed</dd>
                  </dl>
                  <div className="divider" style={{ margin: 'var(--s4) 0' }} />
                  <p className="muted sm" style={{ lineHeight: 1.55 }}>
                    Somnia assigns a fresh validator subcommittee to every agent request. The exact
                    validators and their identical outputs are recorded in each request's receipt.
                  </p>
                  {signals.some(s => s.lastRequestId > 0n) && (
                    <a href="#/receipts" className="mono" style={{ fontSize: 11.5, color: 'var(--accent-hi)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'var(--s3)' }}>
                      View validators in receipts <Icons.Arrow size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Mandate metadata */}
              <div>
                <div className="sec-head"><div className="sec-title"><h2 className="h3">On-chain data</h2></div></div>
                <div className="panel" style={{ padding: 'var(--s5)' }}>
                  <dl className="kv" style={{ gridTemplateColumns: '96px 1fr' }}>
                    <dt>Owner</dt>
                    <dd className="mono row gap2" style={{ fontSize: 11 }}>
                      {m.owner.slice(0, 10)}…{m.owner.slice(-6)}
                      <CopyBtn text={m.owner} size={12} />
                    </dd>
                    <dt>Conjunctive</dt>
                    <dd className="mono" style={{ fontSize: 11 }}>{m.conjunctive ? 'AND (all must trigger)' : 'OR (any can trigger)'}</dd>
                    <dt>Created</dt>
                    <dd className="mono" style={{ fontSize: 11 }}>{fmtAgo(m.createdAt)}</dd>
                    {m.triggeredAt > 0n && (
                      <>
                        <dt>Triggered</dt>
                        <dd className="mono" style={{ fontSize: 11 }}>{fmtAgo(m.triggeredAt)}</dd>
                      </>
                    )}
                    {m.executedAt > 0n && (
                      <>
                        <dt>Executed</dt>
                        <dd className="mono" style={{ fontSize: 11 }}>{fmtAgo(m.executedAt)}</dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function SumCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ padding: 'var(--s4) var(--s5)' }}>
      <div className="label" style={{ fontSize: 9.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-hi)' }}>{value}</div>
    </div>
  )
}
