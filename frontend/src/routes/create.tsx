import React, { useState, useMemo } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { parseEther, parseUnits, formatUnits } from 'viem'
import { lictorAbi } from '../lib/abi'
import { USDC_E, WSOMI, tokenDecimals } from '../lib/chain'
import { getQuote, applySlippage, erc20Abi } from '../lib/quoter'
import { useChainCfg } from '../hooks/useChainCfg'
import { fmtNum } from '../lib/utils'
import { Topbar, useToast } from '../app/shell'
import { AgentChip, TokenPair } from '../app/ui'
import * as Icons from '../app/icons'

const SLIPPAGE_BPS = 50 // 0.5%

const STEPS = ['Write', 'Decompose', 'Confirm', 'Budget', 'Arm'] as const

const DEPOSIT_LLM = 0.24
const DEPOSIT_SIGNAL = 0.33

export default function CreateMandate() {
  const push = useToast()
  const cfg = useChainCfg()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [step, setStep] = useState(0)
  const [thesis, setThesis] = useState(() => sessionStorage.getItem('lictor_draft') ?? '')
  const [decomposing, setDecomposing] = useState(false)
  const [amount, setAmount] = useState('500')
  const [budget, setBudget] = useState(1.5)
  const [phase, setPhase] = useState<'idle' | 'approving' | 'submitting'>('idle')

  const { writeContractAsync } = useWriteContract()

  const amountIn = useMemo(() => {
    try { return parseUnits(amount, tokenDecimals(USDC_E)) } catch { return 0n }
  }, [amount])

  // Live expected-output quote from Algebra QuoterV2 (mainnet). On testnet the DEX
  // isn't deployed, so this errors and we fall back to an unprotected minOut.
  const { data: quote, isFetching: quoteLoading } = useQuery({
    queryKey: ['quote', amountIn.toString(), cfg.chainId],
    enabled: amountIn > 0n && !!publicClient,
    staleTime: 15_000,
    retry: false,
    queryFn: async () => {
      if (!publicClient || amountIn === 0n) return null
      return getQuote(publicClient, USDC_E, WSOMI, amountIn)
    },
  })

  const minOut = quote ? applySlippage(quote, SLIPPAGE_BPS) : 1n
  const expectedOut = quote ? Number(formatUnits(quote, tokenDecimals(WSOMI))) : null

  // Informational preview of signals — decomposer determines the real ones on-chain
  const parsed = useMemo(() => ([
    { id: 'p1', agent: 'parse', source: 'polymarket.com', selector: 'market.bitcoin-100k-2026.yesPrice', comparator: 'LT', threshold: 0.70, decimals: 3 },
    { id: 'p2', agent: 'json',  source: 'api.coinbase.com', selector: '$.data.amount',                comparator: 'GT', threshold: 4000, decimals: 2 },
  ]), [])

  const signalCount = parsed.length
  const estSpend = (DEPOSIT_LLM * 2 + DEPOSIT_SIGNAL * signalCount).toFixed(2)

  const goDecompose = () => {
    if (!thesis.trim()) { push?.({ kind: 'error', title: 'Write a thesis first' }); return }
    setStep(1); setDecomposing(true)
    setTimeout(() => setDecomposing(false), 2600)
  }

  const handleArm = async () => {
    if (!address || !publicClient) { push?.({ kind: 'error', title: 'Connect your wallet first' }); return }
    if (amountIn === 0n) { push?.({ kind: 'error', title: 'Enter a trade size' }); return }
    try {
      // 1. Ensure the contract can pull the input tokens (custody happens in submitMandate)
      const allowance = await publicClient.readContract({
        address: USDC_E, abi: erc20Abi, functionName: 'allowance', args: [address, cfg.lictor],
      }) as bigint
      if (allowance < amountIn) {
        setPhase('approving')
        const approveTx = await writeContractAsync({
          address: USDC_E, abi: erc20Abi, functionName: 'approve', args: [cfg.lictor, amountIn],
        })
        await publicClient.waitForTransactionReceipt({ hash: approveTx })
      }
      // 2. Submit the mandate (escrows budget, takes token custody, dispatches Decomposer)
      setPhase('submitting')
      const submitTx = await writeContractAsync({
        address: cfg.lictor, abi: lictorAbi, functionName: 'submitMandate',
        args: [thesis, USDC_E, WSOMI, amountIn, minOut],
        value: parseEther(budget.toString()),
      })
      await publicClient.waitForTransactionReceipt({ hash: submitTx })
      push?.({ kind: 'success', title: 'Mandate submitted', body: 'Decomposer dispatched — signals coming shortly' })
      sessionStorage.removeItem('lictor_draft')
      setTimeout(() => { location.hash = '#/desk' }, 800)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      push?.({ kind: 'error', title: 'Transaction failed', body: msg.slice(0, 140) })
    } finally {
      setPhase('idle')
    }
  }

  const isWaiting = phase !== 'idle'

  return (
    <>
      <Topbar
        title="New mandate"
        sub="Compose · decompose · arm"
        actions={<a href="#/desk" className="btn btn-ghost btn-sm"><Icons.X size={14} />Cancel</a>}
      />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 860 }}>
          {/* STEPPER */}
          <div className="stepper" style={{ marginBottom: 'var(--s9)', justifyContent: 'center' }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <div className="step-conn" data-done={i <= step} />}
                <div className="step-dot" data-on={i === step} data-done={i < step}>
                  <span className="step-num">{i < step ? <Icons.Check size={12} /> : i + 1}</span>
                  <span className="sm" style={{ color: i === step ? 'var(--text-hi)' : i < step ? 'var(--text-mid)' : 'var(--text-lo)', fontWeight: i === step ? 500 : 400 }}>{s}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* STEP 0 — WRITE */}
          {step === 0 && (
            <div className="fade-up">
              <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>State your thesis</h2>
              <p className="muted" style={{ marginBottom: 'var(--s6)', fontSize: 14.5 }}>Describe the trade in plain English. The Decomposer will parse it into measurable signals.</p>
              <div className="composer">
                <textarea className="composer-input" rows={3} autoFocus value={thesis} onChange={e => setThesis(e.target.value)}
                  placeholder={'e.g. "Buy SOMI if BTC drops below $65,000 and recession odds are above 60%"'} />
                <div className="composer-bar">
                  <span className="tok-pill"><span className="lbl">IN</span>USDC.e</span>
                  <Icons.Arrow size={14} style={{ color: 'var(--text-faint)' }} />
                  <span className="tok-pill"><span className="lbl">OUT</span>WSOMI</span>
                  <div className="grow" />
                  <button className="btn btn-primary btn-sm" onClick={goDecompose}>Decompose <Icons.Arrow size={13} /></button>
                </div>
              </div>
              <div className="row gap3" style={{ marginTop: 'var(--s4)', flexWrap: 'wrap' }}>
                <span className="mono faint" style={{ fontSize: 11 }}>Examples:</span>
                {[
                  'Short ETH if recession odds break 60% and ETH < $2,500',
                  'Buy SOMI if network surpasses 1M daily active addresses',
                ].map(s => (
                  <button key={s} className="chip" onClick={() => setThesis(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — DECOMPOSE */}
          {step === 1 && (
            <div className="fade-up">
              <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>Agent decomposition</h2>
              <p className="muted" style={{ marginBottom: 'var(--s6)', fontSize: 14.5 }}>Preview of signals the on-chain Decomposer will monitor. Final signals are determined after arming.</p>
              <div className="panel" style={{ padding: 'var(--s6)', marginBottom: 'var(--s5)' }}>
                <div className="row gap3" style={{ marginBottom: 'var(--s5)' }}>
                  <AgentChip agent="decomposer" size={26} />
                  <div className="col" style={{ gap: 1 }}>
                    <span className="h4" style={{ fontSize: 14 }}>Decomposer</span>
                    <span className="mono faint" style={{ fontSize: 11 }}>inferString · Qwen3-30B · temp 0</span>
                  </div>
                  <div className="grow" />
                  {decomposing
                    ? <span className="badge is-live"><span className="spinner" style={{ width: 11, height: 11 }} />parsing</span>
                    : <span className="badge is-armed"><Icons.Check size={10} />preview ready</span>}
                </div>
                <div style={{ borderRadius: 'var(--r-md)', border: '1px solid var(--border-mute)', background: 'var(--surface-1)', padding: 'var(--s4)', position: 'relative', overflow: 'hidden' }}>
                  <span className="label" style={{ fontSize: 9 }}>thesis</span>
                  <p style={{ fontSize: 14, color: 'var(--text-hi)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    {thesis}{decomposing && <span className="caret" />}
                  </p>
                </div>
                {decomposing && (
                  <div className="col gap2" style={{ marginTop: 'var(--s5)' }}>
                    {['Tokenizing thesis…', 'Identifying data sources…', 'Mapping comparators & thresholds…'].map((t, i) => (
                      <div key={t} className="row gap2" style={{ animation: `fadeUp 0.4s var(--ease-out) ${i * 700}ms both` }}>
                        <span className="spinner" style={{ width: 12, height: 12 }} />
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-mid)' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!decomposing && (
                  <div className="col gap3" style={{ marginTop: 'var(--s5)' }}>
                    <div className="row between">
                      <span className="label">Logic</span>
                      <span className="badge is-live" style={{ height: 20 }}>conjunctive · AND</span>
                    </div>
                    {parsed.map((p, i) => (
                      <div key={p.id} className="panel" style={{ padding: 'var(--s4)', animation: `fadeUp 0.4s var(--ease-out) ${i * 120}ms both` }}>
                        <div className="row between">
                          <span className="row gap2">
                            <AgentChip agent={p.agent} size={16} />
                            <span className="h4" style={{ fontSize: 13.5 }}>{p.source}</span>
                          </span>
                          <span className="badge" style={{ height: 20 }}>{p.agent === 'parse' ? 'PARSE WEBSITE' : 'JSON API'}</span>
                        </div>
                        <div className="kv" style={{ marginTop: 'var(--s3)', gridTemplateColumns: '90px 1fr' }}>
                          <dt>Source</dt><dd className="mono" style={{ fontSize: 12 }}>{p.source}</dd>
                          <dt>Selector</dt><dd className="mono" style={{ fontSize: 12, color: 'var(--text-mid)' }}>{p.selector}</dd>
                          <dt>Condition</dt><dd className="mono" style={{ fontSize: 12 }}>value {p.comparator} {fmtNum(p.threshold, p.decimals)}</dd>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <NavRow back={() => setStep(0)} nextLabel="Set budget" next={() => !decomposing && setStep(2)} disabled={decomposing} />
            </div>
          )}

          {/* STEP 2 — BUDGET */}
          {step === 2 && (
            <div className="fade-up">
              <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>Budget & execution</h2>
              <p className="muted" style={{ marginBottom: 'var(--s6)', fontSize: 14.5 }}>Fund the agent calls and configure the swap. Unused budget is returned.</p>
              <div className="row gap5 wrap" style={{ alignItems: 'flex-start' }}>
                <div className="panel grow" style={{ padding: 'var(--s6)', minWidth: 300 }}>
                  <div className="col gap5">
                    <div>
                      <span className="field-label">Trade size (USDC.e)</span>
                      <div className="row gap3">
                        <input className="input mono" value={amount} onChange={e => setAmount(e.target.value)} style={{ maxWidth: 140 }} />
                        <span className="tok-pill" style={{ height: 38 }}>USDC.e</span>
                        <Icons.Arrow size={14} style={{ color: 'var(--text-faint)', alignSelf: 'center' }} />
                        <span className="tok-pill" style={{ height: 38 }}>WSOMI</span>
                      </div>
                    </div>
                    <div>
                      <span className="field-label">Agent budget ({cfg.symbol})</span>
                      <input className="input mono" value={budget} onChange={e => setBudget(Number(e.target.value) || 0)} style={{ maxWidth: 140 }} />
                      <input type="range" min="0.6" max="3" step="0.1" value={budget} onChange={e => setBudget(Number(e.target.value))}
                        style={{ width: '100%', marginTop: 12, accentColor: 'var(--accent)' }} />
                    </div>
                    <div>
                      <span className="field-label">Expected output</span>
                      <div className="panel" style={{ padding: 'var(--s4)', background: 'var(--surface-1)' }}>
                        {quoteLoading ? (
                          <span className="row gap2"><span className="spinner" style={{ width: 12, height: 12 }} /><span className="mono faint" style={{ fontSize: 12 }}>Fetching quote…</span></span>
                        ) : expectedOut != null ? (
                          <div className="col gap2">
                            <div className="row between">
                              <span className="sm muted">Expected</span>
                              <span className="mono" style={{ color: 'var(--text-hi)' }}>≈ {fmtNum(expectedOut, 4)} WSOMI</span>
                            </div>
                            <div className="row between">
                              <span className="sm muted">Min received · 0.5% slippage</span>
                              <span className="mono" style={{ color: 'var(--up)' }}>{fmtNum(Number(formatUnits(minOut, tokenDecimals(WSOMI))), 4)} WSOMI</span>
                            </div>
                          </div>
                        ) : (
                          <span className="mono faint" style={{ fontSize: 11.5, color: 'var(--warn)' }}>
                            ⚠ Could not estimate output — slippage unprotected (minOut = 1). Quotes are live on mainnet only.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="panel" style={{ padding: 'var(--s6)', flex: '1 1 280px' }}>
                  <span className="label">Estimated agent spend</span>
                  <div className="col gap3" style={{ marginTop: 'var(--s4)' }}>
                    <CostRow label="Decompose · LLM" v={DEPOSIT_LLM} sym={cfg.symbol} />
                    <CostRow label={`Monitor · ${signalCount} signals`} v={DEPOSIT_SIGNAL * signalCount} sym={cfg.symbol} />
                    <CostRow label="Execute · inferToolsChat" v={DEPOSIT_LLM} sym={cfg.symbol} />
                    <div className="divider" />
                    <div className="row between">
                      <span className="sm" style={{ color: 'var(--text-hi)' }}>Reserved from budget</span>
                      <span className="mono" style={{ color: 'var(--text-hi)' }}>{estSpend} {cfg.symbol}</span>
                    </div>
                    <div className="row between">
                      <span className="sm muted">Headroom</span>
                      <span className="mono" style={{ color: budget - Number(estSpend) >= 0 ? 'var(--up)' : 'var(--down)' }}>
                        {(budget - Number(estSpend)).toFixed(2)} {cfg.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <NavRow back={() => setStep(1)} nextLabel="Review & arm" next={() => setStep(3)} />
            </div>
          )}

          {/* STEP 3 — ARM */}
          {step === 3 && (
            <div className="fade-up">
              <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>Arm mandate</h2>
              <p className="muted" style={{ marginBottom: 'var(--s6)', fontSize: 14.5 }}>One transaction escrows your budget and dispatches the Decomposer. Monitoring begins immediately.</p>
              <div className="panel" style={{ padding: 'var(--s6)', marginBottom: 'var(--s5)' }}>
                <p style={{ fontSize: 16, color: 'var(--text-hi)', lineHeight: 1.5, marginBottom: 'var(--s5)', letterSpacing: '-0.01em' }}>{thesis}</p>
                <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
                  <SumCell label="Trade" value={<TokenPair inT="USDC.e" outT="WSOMI" />} />
                  <SumCell label="Amount" value={<span className="mono">{amount} USDC.e</span>} />
                  <SumCell label="Min received" value={<span className="mono">{expectedOut != null ? `${fmtNum(Number(formatUnits(minOut, tokenDecimals(WSOMI))), 2)} WSOMI` : 'unprotected'}</span>} />
                  <SumCell label="Signals" value={<span className="mono">{signalCount} preview</span>} />
                  <SumCell label="Budget" value={<span className="mono">{budget} {cfg.symbol}</span>} />
                </div>
              </div>
              {expectedOut == null && (
                <p className="mono" style={{ fontSize: 11.5, color: 'var(--warn)', marginBottom: 'var(--s4)' }}>
                  ⚠ No live quote — minOut is unprotected (1). Live quotes require mainnet.
                </p>
              )}
              <div className="row between wrap gap4">
                <button className="btn btn-secondary" onClick={() => setStep(2)} disabled={isWaiting}>
                  <Icons.Arrow size={14} style={{ transform: 'rotate(180deg)' }} />Back
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleArm} disabled={isWaiting}>
                  {isWaiting
                    ? <><span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />{phase === 'approving' ? 'Approving USDC.e…' : 'Arming mandate…'}</>
                    : <><Icons.Bolt size={16} />Arm Mandate → {budget} {cfg.symbol}</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function NavRow({ back, next, nextLabel, disabled }: {
  back: () => void
  next: () => void
  nextLabel: string
  disabled?: boolean
}) {
  return (
    <div className="row between" style={{ marginTop: 'var(--s7)' }}>
      <button className="btn btn-secondary" onClick={back}>
        <Icons.Arrow size={14} style={{ transform: 'rotate(180deg)' }} />Back
      </button>
      <button className="btn btn-primary" onClick={next} aria-disabled={disabled}>
        {nextLabel} <Icons.Arrow size={14} />
      </button>
    </div>
  )
}

function CostRow({ label, v, sym }: { label: string; v: number; sym: string }) {
  return (
    <div className="row between">
      <span className="sm muted">{label}</span>
      <span className="mono faint" style={{ fontSize: 12 }}>{v.toFixed(2)} {sym}</span>
    </div>
  )
}

function SumCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: 'var(--s4) var(--s5)' }}>
      <div className="label" style={{ fontSize: 9.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-hi)' }}>{value}</div>
    </div>
  )
}
