/* ============================================================
   LICTOR — Landing v2 (cinematic execution narrative)
   Ported from CDN landing.jsx + landing_acts.jsx + landing_acts2.jsx
   ============================================================ */

import { useState, useEffect, useRef, useMemo } from 'react'
import type { RefObject, CSSProperties } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { AgentChip, Sparkline } from '../app/ui'
import { generateSeries } from '../lib/utils'
import * as Icons from '../app/icons'

// ─── Demo signal data (marketing page animation, not chain reads) ─────────────

const CMP: Record<number, string> = { 0: '<', 1: '>', 2: '≤', 3: '≥', 4: '=' }

type DemoSignal = {
  label: string; agent: string; source: string; selector: string
  comparator: number; threshold: number; latest: number; triggered: boolean
  history: number[]
}

const DEMO_S1: DemoSignal = {
  label: 'BTC>100k odds', agent: 'parse', source: 'polymarket.com', selector: 'btc-100k.yesPrice',
  comparator: 0, threshold: 0.70, latest: 0.726, triggered: false,
  history: generateSeries(0.78, 0.01, 42, -0.0016),
}
const DEMO_S2: DemoSignal = {
  label: 'ETH spot', agent: 'json', source: 'api.coinbase.com', selector: '$.data.amount',
  comparator: 1, threshold: 4000, latest: 4187, triggered: true,
  history: generateSeries(4070, 18, 42, 4),
}

function fmtDemo(s: DemoSignal): string {
  const v = s.latest
  if (s.agent === 'parse') return v.toFixed(3)
  if (v >= 1000) return '$' + Math.round(v).toLocaleString()
  return v.toFixed(2)
}
function fmtDemoThresh(s: DemoSignal): string {
  if (s.agent === 'parse') return s.threshold.toFixed(2)
  if (s.threshold >= 1000) return '$' + s.threshold.toLocaleString()
  return s.threshold.toFixed(2)
}

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────

function useInView<T extends Element = HTMLDivElement>(
  opts?: { threshold?: number; margin?: string }
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [inV, setInV] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const root = el.closest('.lx') as Element | null
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInV(true); io.disconnect() }
    }, { root, threshold: opts?.threshold ?? 0.15, rootMargin: opts?.margin ?? '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [opts?.threshold, opts?.margin])
  return [ref, inV]
}

function Reveal({ children, d, className = '', style }: {
  children: React.ReactNode; d?: string; className?: string; style?: CSSProperties
}) {
  const [ref, inV] = useInView()
  return (
    <div ref={ref} className={`rv ${className} ${inV ? 'in' : ''}`} data-d={d} style={style}>
      {children}
    </div>
  )
}

// ─── Act header ───────────────────────────────────────────────────────────────

function ActHead({ num, marker, title, sub }: { num: string; marker: string; title: string; sub?: string }) {
  return (
    <div className="act-head">
      <Reveal className="ghost-num">{num}</Reveal>
      <div className="copy">
        <Reveal d="1" className="act-marker">
          <span style={{ width: 18, height: 1, background: 'var(--accent-hi)', display: 'inline-block' }} />
          {marker}
        </Reveal>
        <Reveal d="2"><h2 className="act-title">{title}</h2></Reveal>
        {sub && <Reveal d="3"><p className="act-sub">{sub}</p></Reveal>}
      </div>
    </div>
  )
}

// ─── Social SVGs ──────────────────────────────────────────────────────────────

const SOC = {
  discord: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.32 4.94A19.8 19.8 0 0 0 15.45 3.4a13.7 13.7 0 0 0-.62 1.28 18.3 18.3 0 0 0-5.46 0A13.6 13.6 0 0 0 8.74 3.4 19.7 19.7 0 0 0 3.87 4.95C.77 9.6-.08 14.12.34 18.58a19.9 19.9 0 0 0 6.07 3.08c.49-.67.92-1.38 1.3-2.12-.71-.27-1.4-.6-2.04-1 .17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.16 0c.16.14.33.27.5.4-.65.4-1.34.73-2.05 1 .38.74.81 1.45 1.3 2.12a19.8 19.8 0 0 0 6.08-3.08c.5-5.18-.85-9.65-3.93-13.64ZM8.3 15.84c-1.18 0-2.15-1.08-2.15-2.4 0-1.34.95-2.42 2.15-2.42s2.17 1.09 2.15 2.41c0 1.33-.95 2.41-2.15 2.41Zm7.4 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.34.95-2.42 2.15-2.42s2.17 1.09 2.15 2.41c0 1.33-.94 2.41-2.15 2.41Z" /></svg>,
  x: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2H21.5l-7.5 8.57L22.5 22h-6.9l-5.4-7.06L4 22H.74l8.02-9.17L1.5 2h7.06l4.88 6.45L18.24 2Zm-1.2 18h1.9L7.06 4H5.02l12.02 16Z" /></svg>,
  telegram: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 4.3 18.6 20.05c-.25 1.1-.9 1.37-1.83.86l-5.05-3.72-2.43 2.34c-.27.27-.5.5-1.02.5l.36-5.16L16.9 7.3c.41-.36-.09-.56-.63-.2L6.6 13.05l-4.98-1.55c-1.08-.34-1.1-1.08.23-1.6L20.5 2.74c.9-.33 1.69.2 1.44 1.56Z" /></svg>,
}

// ─── Top nav (full-width → floating pill on scroll) ───────────────────────────

function TopNav({ scrolled }: { scrolled: boolean }) {
  const links = [
    { label: 'System',    href: '#/' },
    { label: 'Consensus', href: '#/consensus' },
    { label: 'Receipts',  href: '#/receipts' },
    { label: 'Docs',      href: '#/docs' },
  ]
  return (
    <nav className="lnav2" data-scrolled={scrolled ? 'true' : 'false'}>
      <div className="lnav2-inner">
        <a href="#/" className="nav-brand">
          <Icons.Logo size={20} />
          <span className="nav-wordmark">LICTOR</span>
        </a>
        <span className="nav-tag">AUTONOMOUS EXECUTION LAYER</span>
        <span className="nav-div opt" />
        <div className="nav-links">
          {links.map(l => <a key={l.label} href={l.href}>{l.label}</a>)}
        </div>
        <div className="nav-spacer" />
        <div className="nav-soc">
          <a href="#" aria-label="Discord" className="nav-soc-hide-mobile">{SOC.discord}</a>
          <a href="#" aria-label="X">{SOC.x}</a>
          <a href="#" aria-label="Telegram" className="nav-soc-hide-mobile">{SOC.telegram}</a>
        </div>
        <a href="#/docs" className="nav-docs-mobile">Docs</a>
        <span className="nav-div" />
        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
            if (!mounted || !account || !chain) {
              return (
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 999 }} onClick={openConnectModal}>
                  Connect Wallet
                </button>
              )
            }
            return (
              <div className="wallet-chip" style={{ cursor: 'pointer' }} onClick={openAccountModal}>
                <span className="pulse-dot up" style={{ width: 5, height: 5 }} />
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-hi)' }}>
                  {account.address.slice(0, 6)}…{account.address.slice(-4)}
                </span>
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    </nav>
  )
}

// ─── Execution trace (sticky lifecycle spine) ─────────────────────────────────

const TRACE_STAGES = [
  { name: 'Signal',    val: '0.726' },
  { name: 'Debate',   val: '3 agents' },
  { name: 'Consensus', val: '96.2%' },
  { name: 'Capital',  val: '500 USDC' },
  { name: 'Execution', val: '+41,992' },
  { name: 'Receipts', val: '5 calls' },
]

function ExecutionTrace({ active, onJump, hidden }: {
  active: number; onJump: (i: number) => void; hidden: boolean
}) {
  return (
    <div className="trace" data-hidden={hidden ? 'true' : 'false'}>
      <div className="trace-inner">
        {TRACE_STAGES.map((st, i) => {
          const state = i === active ? 'active' : i < active ? 'done' : 'idle'
          return (
            <button key={i} className="trace-stage" data-state={state} onClick={() => onJump(i)}>
              <div className="ts-top">
                <span className="ts-dot" />
                <span className="ts-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="ts-name">{st.name}</span>
              </div>
              <span className="ts-val">{st.val}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Live desk centerpiece (hero) ─────────────────────────────────────────────

type LogEntry = { id: number; a: string | null; t: string; ok: boolean | 'trigger' | 'exec' | null }

function LiveDesk() {
  const [phase, setPhase] = useState(0)
  const [s1, setS1] = useState(0.726)
  const [s2, setS2] = useState(4187)
  const [hist1, setHist1] = useState(() => generateSeries(0.78, 0.01, 32, -0.0016))
  const [hist2, setHist2] = useState(() => generateSeries(4070, 18, 32, 4))
  const [log, setLog] = useState<LogEntry[]>([])
  let counter = 0

  useEffect(() => {
    const id = setInterval(() => {
      setS1(v => {
        const nv = Math.max(0.66, v - 0.0022 + (Math.random() - 0.5) * 0.004)
        setHist1(h => [...h.slice(-31), nv])
        return nv
      })
      setS2(v => {
        const nv = v + 1.6 + (Math.random() - 0.5) * 8
        setHist2(h => [...h.slice(-31), nv])
        return nv
      })
    }, 900)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const addLog = (entry: Omit<LogEntry, 'id'>) =>
      setLog(l => [...l.slice(-5), { ...entry, id: counter++ }])

    const run = () => {
      setPhase(0); setLog([])
      timers.push(setTimeout(() => addLog({ a: 'json',     t: 'ETH spot above $4,000: signal met',            ok: true }),   600))
      timers.push(setTimeout(() => { setPhase(1); addLog({ a: 'parse',    t: 'Polymarket odds crossing 0.70…',              ok: null }) }, 3000))
      timers.push(setTimeout(() => { setPhase(2); setS1(0.688); addLog({ a: 'parse', t: 'BTC>100k odds 0.688: signal met',  ok: true  }) }, 5200))
      timers.push(setTimeout(() => addLog({ a: null, t: 'All conditions satisfied (AND): triggering',          ok: 'trigger' }), 6000))
      timers.push(setTimeout(() => { setPhase(3); addLog({ a: 'executor', t: 'Writing trade: swap(USDC, SOMI, 500)',         ok: null }) }, 7000))
      timers.push(setTimeout(() => addLog({ a: 'executor', t: 'Trade verified · ready to execute',            ok: true }),  8600))
      timers.push(setTimeout(() => { setPhase(4); addLog({ a: null, t: 'Swap settled: received 41,992 SOMI',  ok: 'exec' }) }, 9800))
      timers.push(setTimeout(run, 14500))
    }
    run()
    return () => timers.forEach(clearTimeout)
  }, [])

  const sig1Met = phase >= 2

  return (
    <div className="livedesk">
      <div className="livedesk-hd">
        <div className="ld-dots"><span /><span /><span /></div>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>lictor / desk</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-hi)' }}>LCT-0042</span>
        <div className="grow" />
        <span className="badge is-live"><span className="pulse-dot" style={{ width: 5, height: 5 }} />live</span>
      </div>
      <div className="livedesk-body">
        <div className="ld-left">
          <span className="label">Standing order</span>
          <p style={{ fontSize: 13.5, color: 'var(--text-hi)', lineHeight: 1.5, margin: '8px 0 16px', letterSpacing: '-0.01em' }}>
            Buy <span className="mono" style={{ color: 'var(--accent-hi)' }}>SOMI</span> if Polymarket
            <span style={{ color: 'var(--text-hi)' }}> &quot;BTC &gt; $100k&quot;</span> odds drop below 70% and ETH is above $4,000.
          </p>
          <div className="col gap4">
            <LDSignal label="BTC>100k odds" value={s1.toFixed(3)} cmp="<" thr="0.70" met={sig1Met}
              hist={hist1} agent="parse" col={sig1Met ? 'var(--up)' : 'var(--warn)'} thrLine={0.70} />
            <LDSignal label="ETH spot" value={`$${Math.round(s2).toLocaleString()}`} cmp=">" thr="$4,000"
              met hist={hist2} agent="json" col="var(--up)" thrLine={4000} />
          </div>
        </div>
        <div className="ld-right">
          <div className="row between" style={{ marginBottom: 4 }}>
            <span className="label">Agent activity</span>
            <span className="mono faint" style={{ fontSize: 10 }}>3 validators</span>
          </div>
          <div className="col gap2" style={{ flex: 1, minHeight: 168 }}>
            {log.map(e => (
              <div key={e.id} className="row gap2" style={{ animation: 'fadeUp 0.35s var(--ease-out) both', alignItems: 'flex-start' }}>
                <span style={{ marginTop: 1, flex: 'none' }}>
                  {e.ok === true    ? <Icons.CheckCircle size={14} style={{ color: 'var(--up)' }} />
                    : e.ok === 'trigger' ? <Icons.Bolt  size={14} style={{ color: 'var(--accent-hi)' }} />
                    : e.ok === 'exec'    ? <Icons.Check size={14} style={{ color: 'var(--up)' }} />
                    : <span className="spinner" style={{ width: 13, height: 13 }} />}
                </span>
                {e.a && <AgentChip agent={e.a} size={15} />}
                <span className="mono" style={{ fontSize: 11.5, lineHeight: 1.4,
                  color: (e.ok === 'trigger' || e.ok === 'exec') ? 'var(--text-hi)' : 'var(--text-mid)' }}>
                  {e.t}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 'var(--s3)', borderTop: '1px solid var(--border-mute)' }}>
            <div className="row between">
              <span className="row gap2">
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--up-soft)', border: '1px solid var(--up-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Check size={9} style={{ color: 'var(--up)' }} />
                  </span>
                ))}
                <span className="mono" style={{ fontSize: 11, color: 'var(--up)' }}>3/3 consensus</span>
              </span>
              <span className="mono" style={{ fontSize: 11, color: phase >= 4 ? 'var(--up)' : 'var(--accent-hi)' }}>
                {phase >= 4 ? 'EXECUTED' : phase >= 3 ? 'EXECUTING' : phase >= 2 ? 'TRIGGERED' : 'MONITORING'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LDSignal({ label, value, cmp, thr, met, hist, agent, col, thrLine }: {
  label: string; value: string; cmp: string; thr: string; met: boolean
  hist: number[]; agent: string; col: string; thrLine: number
}) {
  return (
    <div className="ld-signal" style={{ borderColor: met ? 'var(--up-line)' : 'var(--border)' }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <span className="row gap2">
          {met
            ? <Icons.CheckCircle size={13} style={{ color: 'var(--up)' }} />
            : <span style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid var(--warn)', display: 'inline-block' }} />}
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>{label}</span>
          <AgentChip agent={agent} size={14} />
        </span>
        <span className="row gap2">
          <span className="mono" style={{ fontSize: 13, color: 'var(--text-hi)' }}>{value}</span>
          <span className="mono faint" style={{ fontSize: 10.5 }}>{cmp} {thr}</span>
        </span>
      </div>
      <Sparkline data={hist} w={300} h={30} threshold={thrLine} color={col} glow={met} strokeW={1.5} />
    </div>
  )
}

// ─── Big chart (Act 01) ───────────────────────────────────────────────────────

function BigChart({ data, threshold, color, w = 760, h = 280 }: {
  data: number[]; threshold: number; color?: string; w?: number; h?: number
}) {
  const c = color || 'var(--accent-hi)'
  const gid = useMemo(() => 'bc' + Math.random().toString(36).slice(2, 7), [])
  const result = useMemo(() => {
    if (!data || data.length < 2) return null
    const min = Math.min(...data, threshold), max = Math.max(...data, threshold)
    const range = (max - min) || 1; const pad = range * 0.22
    const lo = min - pad, hi = max + pad, rng = hi - lo
    const X = (i: number) => (i / (data.length - 1)) * w
    const Y = (v: number) => h - ((v - lo) / rng) * h
    let path = `M ${X(0)} ${Y(data[0])}`
    data.forEach((v, i) => { if (i) path += ` L ${X(i).toFixed(1)} ${Y(v).toFixed(1)}` })
    return { path, area: path + ` L ${w} ${h} L 0 ${h} Z`, thY: Y(threshold), last: { x: X(data.length - 1), y: Y(data[data.length - 1]) } }
  }, [data, w, h, threshold])

  if (!result) return <div style={{ height: h }} />
  const { path, area, thY, last } = result
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.18" /><stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map(f => <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="var(--border-faint)" strokeWidth="1" />)}
      <line x1="0" y1={thY} x2={w} y2={thY} stroke="var(--warn)" strokeWidth="1" strokeDasharray="4 5" opacity="0.85" />
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <line x1={last.x} y1="0" x2={last.x} y2={h} stroke="var(--accent-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r="3.5" fill={c} />
      <circle cx={last.x} cy={last.y} r="3.5" fill="none" stroke={c}>
        <animate attributeName="r" values="3.5;10;3.5" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ─── ACT 01 — Signal detected ─────────────────────────────────────────────────

function ActSignal() {
  const [s1, setS1] = useState<DemoSignal>({ ...DEMO_S1, history: [...DEMO_S1.history] })
  const [s2] = useState<DemoSignal>(DEMO_S2)

  useEffect(() => {
    const id = setInterval(() => {
      setS1(prev => {
        const nv = Math.max(0.66, prev.latest - 0.002 + (Math.random() - 0.5) * 0.004)
        return { ...prev, latest: nv, triggered: nv < prev.threshold, history: [...prev.history.slice(-41), nv] }
      })
    }, 1100)
    return () => clearInterval(id)
  }, [])

  const dist1 = (Math.abs((s1.latest - s1.threshold) / s1.threshold) * 100).toFixed(2)

  return (
    <section className="act" data-stage="0">
      <div className="lx-wrap">
        <ActHead num="01" marker="Signal detected"
          title="The desk is watching markets you can't."
          sub="Write your conditions once and forget about it. Lictor checks every signal around the clock, across any source you point it at." />
        <Reveal d="1" className="sig-layout">
          <div className="instr reg sig-chart">
            <div className="instr-hd">
              <span className="row gap2"><AgentChip agent={s1.agent} size={15} />{s1.source} · {s1.selector}</span>
              <span style={{ color: 'var(--warn)' }}>THRESHOLD {CMP[s1.comparator]} {fmtDemoThresh(s1)}</span>
            </div>
            <div className="row between" style={{ padding: 'var(--s4) var(--s4) var(--s2)' }}>
              <div className="sig-readout-big">
                <span className="readout" style={{ fontSize: 'clamp(44px,6vw,72px)', color: s1.triggered ? 'var(--up)' : 'var(--text-hi)' }}>{fmtDemo(s1)}</span>
                <span className="col" style={{ gap: 2 }}>
                  <span className="mono" style={{ fontSize: 12, color: s1.triggered ? 'var(--up)' : 'var(--warn)' }}>
                    {s1.triggered ? '✓ condition met' : '↓ approaching'}
                  </span>
                  <span className="mono faint" style={{ fontSize: 11 }}>{dist1}% to trigger</span>
                </span>
              </div>
              <span className="label" style={{ alignSelf: 'flex-start' }}>{s1.label}</span>
            </div>
            <div className="grow" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <BigChart data={s1.history} threshold={s1.threshold} color={s1.triggered ? 'var(--up)' : 'var(--accent-hi)'} />
            </div>
            <div className="row between" style={{ padding: 'var(--s2) var(--s4)', borderTop: '1px solid var(--border-faint)' }}>
              {['-40m', '-30m', '-20m', '-10m', 'now'].map(t => <span key={t} className="mono faint" style={{ fontSize: 9.5 }}>{t}</span>)}
            </div>
          </div>
          <div className="sig-side">
            <div className="instr" style={{ padding: 'var(--s5)' }}>
              <div className="row between" style={{ marginBottom: 'var(--s3)' }}>
                <span className="row gap2"><AgentChip agent={s2.agent} size={15} /><span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>{s2.label}</span></span>
                <span className="badge is-armed" style={{ height: 18 }}><Icons.Check size={9} />met</span>
              </div>
              <div className="row between" style={{ alignItems: 'flex-end' }}>
                <span className="readout" style={{ fontSize: 34, color: 'var(--up)' }}>{fmtDemo(s2)}</span>
                <span className="mono faint" style={{ fontSize: 11 }}>{CMP[s2.comparator]} {fmtDemoThresh(s2)}</span>
              </div>
              <div style={{ marginTop: 'var(--s3)' }}>
                <Sparkline data={s2.history} w={300} h={40} threshold={s2.threshold} color="var(--up)" strokeW={1.6} />
              </div>
              <div className="mono faint" style={{ fontSize: 10, marginTop: 8 }}>{s2.source} · {s2.selector}</div>
            </div>
            <div className="instr" style={{ padding: 'var(--s5)' }}>
              <span className="label">Provenance</span>
              <div className="col gap3" style={{ marginTop: 'var(--s4)' }}>
                {([['JSON API', 'typed endpoints', 'json'], ['Parse Website', 'HTML / odds boards', 'parse']] as const).map(([n, d, a]) => (
                  <div key={n} className="row gap3">
                    <AgentChip agent={a} size={22} />
                    <div className="col" style={{ gap: 1 }}>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>{n}</span>
                      <span className="mono faint" style={{ fontSize: 10.5 }}>{d}</span>
                    </div>
                    <span className="grow" />
                    <span className="mono" style={{ fontSize: 10, color: 'var(--up)' }}>● live</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── ACT 02 — Deliberation (node graph) ──────────────────────────────────────

function DebateGraph({ active }: { active: boolean }) {
  const vals = [{ y: 70, n: 'aurelius' }, { y: 180, n: 'cato' }, { y: 290, n: 'gracchus' }]
  return (
    <svg width="100%" viewBox="0 0 640 360" style={{ display: 'block' }}>
      {vals.map((v, i) => {
        const len = 360
        return (
          <path key={i} d={`M 150 180 C 320 180, 360 ${v.y}, 480 ${v.y}`} fill="none"
            stroke={active ? 'var(--accent-line)' : 'var(--border)'} strokeWidth="1.5"
            strokeDasharray={len} strokeDashoffset={active ? 0 : len}
            style={{ transition: `stroke-dashoffset 1s var(--ease-out) ${i * 200}ms, stroke 0.6s` }} />
        )
      })}
      {active && vals.map((v, i) => (
        <circle key={'p' + i} r="3" fill="var(--accent-hi)">
          <animateMotion dur="2.2s" begin={`${i * 0.4}s`} repeatCount="indefinite"
            path={`M 150 180 C 320 180, 360 ${v.y}, 480 ${v.y}`} />
        </circle>
      ))}
      <g>
        <circle cx="150" cy="180" r="34" fill="var(--accent-softer)" stroke="var(--accent-line)" strokeWidth="1.4" />
        <text x="150" y="176" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="16" fill="var(--accent-hi)" fontWeight="500">D</text>
        <text x="150" y="192" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="var(--text-mid)" letterSpacing="0.5">DECOMP</text>
      </g>
      {vals.map((v, i) => (
        <g key={'v' + i} style={{ opacity: active ? 1 : 0.3, transition: `opacity 0.6s ${i * 200 + 600}ms` }}>
          <circle cx="510" cy={v.y} r="26" fill="var(--up-soft)" stroke="var(--up-line)" strokeWidth="1.3" />
          <path d={`M 500 ${v.y} l 5 5 9 -11`} fill="none" stroke="var(--up)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="556" y={v.y + 4} fontFamily="var(--font-mono)" fontSize="11" fill="var(--text-mid)">val.{v.n}</text>
        </g>
      ))}
    </svg>
  )
}

function ActDebate() {
  const [ref, inV] = useInView({ threshold: 0.08, margin: '0px 0px -15% 0px' })
  const lines = [
    { v: 'val.aurelius',  r: 'fra', out: 'signal[0] · LT 0.700 · parsed',       ok: true,      d: 0 },
    { v: 'val.cato',      r: 'sgp', out: 'signal[0] · LT 0.700 · parsed',       ok: true,      d: 1 },
    { v: 'val.gracchus',  r: 'nyc', out: 'signal[0] · LT 0.70 · parsed',        ok: 'pending', d: 2 },
    { v: 'val.aurelius',  r: 'fra', out: 'logic · conjunctive AND',              ok: true,      d: 3 },
    { v: 'val.gracchus',  r: 'nyc', out: 'signal[0] · LT 0.700 · re-parsed',    ok: true,      d: 4 },
    { v: 'val.cato',      r: 'sgp', out: 'logic · conjunctive AND',              ok: true,      d: 5 },
  ] as const
  return (
    <section className="act" data-stage="1">
      <div className="lx-wrap">
        <ActHead num="02" marker="Deliberation"
          title="Then the agents argue it out."
          sub="Your thesis goes to a group of independent validators. Each reads it separately and builds an execution plan. If they don't all agree, nothing moves forward." />
        <div className="debate-layout" ref={ref}>
          <div className="instr reg" style={{ padding: 0, position: 'relative', minHeight: 360 }}>
            <div className="instr-hd">
              <span>DECOMPOSER → SUBCOMMITTEE</span>
              <span>inferString · temp 0 · seed 0x00</span>
            </div>
            <DebateGraph active={inV} />
          </div>
          <div className="instr deliberation">
            <div className="instr-hd">
              <span>Deliberation log</span>
              <span className="row gap2"><span className="pulse-dot" style={{ width: 5, height: 5 }} />streaming</span>
            </div>
            <div style={{ flex: 1 }}>
              {lines.map((ln, i) => (
                <div key={i} className="delib-line"
                  style={{ opacity: inV ? 1 : 0, transform: inV ? 'none' : 'translateX(10px)', transition: `all 0.5s var(--ease-out) ${ln.d * 260 + 200}ms` }}>
                  <span>{ln.ok === true ? <Icons.Check size={13} style={{ color: 'var(--up)' }} /> : <span className="spinner" style={{ width: 11, height: 11 }} />}</span>
                  <span style={{ color: 'var(--text-hi)' }}>{ln.v}</span>
                  <span style={{ color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ln.out}</span>
                  <span className="faint" style={{ fontSize: 9.5 }}>{ln.r}</span>
                </div>
              ))}
            </div>
            <div className="row between" style={{ padding: 'var(--s3) var(--s4)', borderTop: '1px solid var(--border-mute)' }}>
              <span className="mono faint" style={{ fontSize: 10.5 }}>3 validators · 6 responses</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--accent-hi)' }}>converging…</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── ACT 03 — Consensus forms ─────────────────────────────────────────────────

function ActConsensus() {
  const [ref, inV] = useInView({ threshold: 0.3 })
  const target = '11010110'
  const drafts = ['11010010', '11010110', '01010110']
  return (
    <section className="act" data-stage="2">
      <div className="lx-wrap">
        <ActHead num="03" marker="Consensus"
          title="Until every validator reaches the exact same answer."
          sub="No averaging. No guessing. Every validator must produce the identical result. If even one disagrees, the decision is rejected and replayed." />
        <div className="consensus-stage" ref={ref}>
          <div className="fingerprints">
            {drafts.map((draft, i) => (
              <div key={i} className="fp">
                <span className="mono faint" style={{ fontSize: 10.5, width: 92 }}>
                  val.{(['aurelius', 'cato', 'gracchus'] as const)[i]}
                </span>
                <div className="fp-bits">
                  {target.split('').map((bit, j) => (
                    <span key={j} className="fp-bit"
                      style={{ transition: `background 0.4s ${j * 60 + i * 120 + 300}ms`,
                        background: inV ? (bit === '1' ? 'var(--up)' : 'var(--surface-3)') : (draft[j] === target[j] ? 'var(--surface-3)' : 'var(--down)') }} />
                  ))}
                </div>
                <span className="mono" style={{ fontSize: 10.5, color: inV ? 'var(--up)' : 'var(--down)', transition: 'color 0.4s 0.9s' }}>
                  {inV ? 'match' : 'draft'}
                </span>
              </div>
            ))}
            <div className="row gap3" style={{ marginTop: 'var(--s5)', alignItems: 'center', opacity: inV ? 1 : 0, transition: 'opacity 0.6s 1.1s' }}>
              <Icons.Shield size={20} style={{ color: 'var(--up)' }} />
              <span className="readout" style={{ fontSize: 30, color: 'var(--up)' }}>3/3</span>
              <div className="col" style={{ gap: 1 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>96.2% confidence</span>
                <span className="mono faint" style={{ fontSize: 10.5 }}>byte-level agreement · finalized</span>
              </div>
            </div>
          </div>
          <Reveal d="2" className="instr reg" style={{ padding: 0 }}>
            <div className="instr-hd">
              <span>FINALIZED OUTPUT · rcp_8821</span>
              <span style={{ color: 'var(--up)' }}>● consensus</span>
            </div>
            <pre className="code" style={{ border: 'none', borderRadius: 0, background: 'transparent', fontSize: 11.5 }}>
              {'{\n  '}<span className="k">&quot;conjunctive&quot;</span>{': '}<span className="n">true</span>{',\n  '}
              <span className="k">&quot;signals&quot;</span>{': [\n    \{ '}<span className="k">&quot;source&quot;</span>{': '}<span className="s">&quot;polymarket.com&quot;</span>
              {',\n      '}<span className="k">&quot;selector&quot;</span>{': '}<span className="s">&quot;btc-100k.yesPrice&quot;</span>
              {',\n      '}<span className="k">&quot;cmp&quot;</span>{': '}<span className="s">&quot;LT&quot;</span>{', '}<span className="k">&quot;threshold&quot;</span>{': '}<span className="n">0.70</span>{' \},\n    \{ '}
              <span className="k">&quot;source&quot;</span>{': '}<span className="s">&quot;api.coinbase.com&quot;</span>
              {',\n      '}<span className="k">&quot;selector&quot;</span>{': '}<span className="s">&quot;$.data.amount&quot;</span>
              {',\n      '}<span className="k">&quot;cmp&quot;</span>{': '}<span className="s">&quot;GT&quot;</span>{', '}<span className="k">&quot;threshold&quot;</span>{': '}<span className="n">4000</span>{' \}\n  ]\n}'}
            </pre>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ─── ACT 04 — Capital allocated ───────────────────────────────────────────────

function ActCapital() {
  const nodes = [
    { t: 'Budget',   v: '1.00 SOMI',      d: 'escrowed',            a: null },
    { t: 'Executor', v: 'inferToolsChat',  d: 'tool calling',        a: 'executor' },
    { t: 'Tool call', v: 'swap()',         d: 'whitelisted selector', a: null },
    { t: 'Router',   v: 'Algebra Integral', d: '$296K TVL',          a: null },
    { t: 'Pool',     v: 'USDC.e / WSOMI',  d: 'settled',             a: null },
  ]
  return (
    <section className="act" data-stage="3">
      <div className="lx-wrap">
        <ActHead num="04" marker="Capital allocated"
          title="The model writes the trade itself."
          sub="When your conditions are met, the agent writes the exact trade. Not a notification. Not a suggestion. The transaction itself, ready to execute on-chain." />
        <Reveal d="1" className="pipeline">
          {nodes.map((n, i) => (
            <div key={i} className="pipe-node">
              {i < nodes.length - 1 && <span className="pipe-flow" />}
              <span className="mono faint" style={{ fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</span>
              <div className="row gap2" style={{ alignItems: 'center' }}>
                {n.a && <AgentChip agent={n.a} size={18} />}
                <span className="mono" style={{ fontSize: 13.5, color: 'var(--text-hi)' }}>{n.t}</span>
              </div>
              <span className="mono" style={{ fontSize: 12, color: 'var(--accent-hi)' }}>{n.v}</span>
              <span className="grow" />
              <span className="mono faint" style={{ fontSize: 10.5 }}>{n.d}</span>
            </div>
          ))}
        </Reveal>
        <Reveal d="2" className="row gap5 wrap" style={{ marginTop: 'var(--s6)' }}>
          <div className="instr reg grow" style={{ padding: 'var(--s5)', minWidth: 300 }}>
            <span className="label">Yielded calldata · pendingToolCalls[0]</span>
            <pre className="code" style={{ border: 'none', borderRadius: 0, background: 'transparent', padding: 'var(--s3) 0 0', fontSize: 11 }}>
              {'executeSwap(\n  tokenIn:  '}<span className="s">0x28bE…A200</span>{'  '}<span className="c">// USDC.e</span>
              {'\n  tokenOut: '}<span className="s">0x046E…cAb</span>{'   '}<span className="c">// WSOMI</span>
              {'\n  amountIn: '}<span className="n">500_000000</span>
              {'\n  minOut:   '}<span className="n">41_160_000</span>{'     '}<span className="c">// slippage bound</span>
              {'\n)'}
            </pre>
          </div>
          <div className="col gap3" style={{ minWidth: 200, justifyContent: 'center' }}>
            {([['Trade size', '500 USDC.e'], ['Min received', '41,160 WSOMI'], ['Max slippage', '0.5%'], ['Selector', 'whitelisted ✓']] as const).map(([k, v]) => (
              <div key={k} className="row between" style={{ borderBottom: '1px solid var(--border-faint)', paddingBottom: 8 }}>
                <span className="mono faint" style={{ fontSize: 11 }}>{k}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>{v}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── ACT 05 — Execution ───────────────────────────────────────────────────────

function ActExecution() {
  const [ref, inV] = useInView({ threshold: 0.12, margin: '0px 0px -12% 0px' })
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!inV) return
    const t1 = setTimeout(() => setPhase(1), 500)
    const t2 = setTimeout(() => setPhase(2), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [inV])

  return (
    <section className="act" data-stage="4">
      <div className="lx-wrap">
        <ActHead num="05" marker="Execution"
          title="No human approves the trade."
          sub="The contract verifies the trade and sends it. From the moment your conditions are met to settlement on-chain, no one flips a switch. The chain does it." />
        <Reveal d="1" className="exec-hero reg">
          <div ref={ref} className="row between wrap" style={{ gap: 'var(--s7)', alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 'var(--s5)', minWidth: 260 }}>
              <div className="row gap3" style={{ alignItems: 'center' }}>
                <span className="mono faint" style={{ fontSize: 12 }}>LCT-0042</span>
                <Icons.Arrow size={14} style={{ color: 'var(--text-faint)' }} />
                <span className="mono" style={{ fontSize: 12, color: phase >= 1 ? 'var(--accent-hi)' : 'var(--text-mid)' }}>
                  {phase === 0 ? 'ARMED' : phase === 1 ? 'EXECUTING…' : 'SETTLED'}
                </span>
              </div>
              <div className="exec-flip" style={{ color: phase >= 2 ? 'var(--up)' : 'var(--text-mid)', transition: 'color 0.5s' }}>
                {phase < 2 ? 'EXECUTING' : 'EXECUTED'}
                {phase === 1 && <span className="caret" style={{ height: '0.7em', width: 14 }} />}
              </div>
              <div className="row gap3" style={{ alignItems: 'baseline', opacity: phase >= 2 ? 1 : 0.3, transition: 'opacity 0.5s' }}>
                <span className="readout" style={{ fontSize: 'clamp(28px,3.4vw,46px)', color: 'var(--up)' }}>+41,992</span>
                <span className="mono" style={{ fontSize: 16, color: 'var(--text-mid)' }}>WSOMI</span>
                <span className="mono faint" style={{ fontSize: 12 }}>filled · 0.5% slippage</span>
              </div>
            </div>
            <div className="col gap3" style={{ minWidth: 260, flex: 1 }}>
              {([
                ['route',          'Algebra Integral · USDC.e→WSOMI'],
                ['settlement tx',  '0x88fe…11a9'],
                ['block',          '401,415,022'],
                ['gas',            '0.0019 SOMI'],
                ['receipt',        'rcp_8842'],
              ] as const).map(([k, v], i) => (
                <div key={k} className="row between" style={{ borderBottom: '1px solid var(--border-mute)', paddingBottom: 9, opacity: phase >= 2 ? 1 : 0.25, transition: `opacity 0.4s ${i * 80}ms` }}>
                  <span className="mono faint" style={{ fontSize: 11 }}>{k}</span>
                  <span className="mono" style={{ fontSize: 12, color: k === 'settlement tx' || k === 'receipt' ? 'var(--accent-hi)' : 'var(--text-hi)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="meter" style={{ marginTop: 'var(--s7)', height: 3 }}>
            <span style={{ width: phase === 0 ? '8%' : phase === 1 ? '64%' : '100%', background: phase >= 2 ? 'var(--up)' : 'var(--accent-hi)', transition: 'width 1.2s var(--ease-out), background 0.4s' }} />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── ACT 06 — Receipts ────────────────────────────────────────────────────────

function ActReceipts() {
  const trail = [
    { id: 'rcp_8821', agent: 'decomposer', step: 'Decompose thesis',        cons: 0.94, res: 'Success', lat: 1840 },
    { id: 'rcp_8822', agent: 'json',       step: 'Fetch ETH spot',          cons: 0.99, res: 'Success', lat:  720 },
    { id: 'rcp_8831', agent: 'parse',      step: 'Fetch BTC>100k odds',     cons: 0.91, res: 'Success', lat: 2110 },
    { id: 'rcp_8841', agent: 'executor',   step: 'Yield swap calldata',     cons: 0.96, res: 'Success', lat: 1530 },
    { id: 'rcp_8842', agent: null,         step: 'Settle on Algebra DEX',   cons: 1.00, res: 'Success', lat:  410 },
  ]
  return (
    <section className="act" data-stage="5">
      <div className="lx-wrap">
        <ActHead num="06" marker="Receipts"
          title="And every step left something you can open."
          sub="Not a screenshot. Not a log on someone's server. Every agent call produces a verifiable on-chain receipt: what was asked, what each validator returned, and what was agreed." />
        <Reveal d="1" className="ledger reg">
          <div className="ledger-row hd">
            <span>Request</span><span>Step</span>
            <span className="lc-hide">Consensus</span><span className="lc-hide">Latency</span>
            <span className="lc-hide">Result</span><span />
          </div>
          {trail.map(r => (
            <div key={r.id} className="ledger-row" style={{ cursor: 'pointer' }}>
              <span style={{ color: 'var(--accent-hi)' }}>{r.id}</span>
              <span className="row gap2" style={{ minWidth: 0 }}>
                {r.agent
                  ? <AgentChip agent={r.agent} size={15} />
                  : <span style={{ width: 15, height: 15, borderRadius: 3, background: 'var(--up-soft)', border: '1px solid var(--up-line)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icons.Check size={9} style={{ color: 'var(--up)' }} />
                    </span>}
                <span style={{ color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.step}</span>
              </span>
              <span className="lc-hide" style={{ color: 'var(--up)' }}>{(r.cons * 100).toFixed(0)}%</span>
              <span className="lc-hide faint">{r.lat}ms</span>
              <span className="lc-hide" style={{ color: 'var(--up)' }}>● {r.res}</span>
              <span style={{ textAlign: 'right' }}><Icons.External size={12} style={{ color: 'var(--text-faint)', display: 'inline' as const }} /></span>
            </div>
          ))}
        </Reveal>

        <Reveal d="2" className="row between wrap" style={{ marginTop: 'var(--s10)', gap: 'var(--s7)', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 420px' }}>
            <span className="act-marker">
              <span style={{ width: 18, height: 1, background: 'var(--accent-hi)', display: 'inline-block' }} />
              Why only on Somnia
            </span>
            <p style={{ fontSize: 'clamp(20px,2.2vw,30px)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.3, color: 'var(--text-hi)', marginTop: 'var(--s4)', maxWidth: '20ch' }}>
              Other chains run the AI off-chain and ask you to trust an attestation.
            </p>
            <p className="act-sub" style={{ maxWidth: '42ch' }}>
              Somnia runs the model on its validators and reaches consensus on the exact output. The decision <span style={{ color: 'var(--text-hi)' }}>is</span> the consensus. That&apos;s the whole product.
            </p>
          </div>
          <div className="instr" style={{ flex: '1 1 360px', padding: 0 }}>
            {([
              ['Decision made on-chain',  'lictor',        true],
              ['Plain-English mandate',   'lictor',        true],
              ['Off-chain bot + oracle',  'everyone else', false],
              ['Trust an operator',       'everyone else', false],
            ] as const).map(([t, who, ours], i) => (
              <div key={i} className="row between" style={{ padding: 'var(--s4) var(--s5)', borderBottom: i < 3 ? '1px solid var(--border-faint)' : 'none' }}>
                <span className="row gap3">
                  {ours ? <Icons.Check size={15} style={{ color: 'var(--up)' }} /> : <Icons.X size={14} style={{ color: 'var(--text-faint)' }} />}
                  <span style={{ fontSize: 13.5, color: ours ? 'var(--text-hi)' : 'var(--text-mid)' }}>{t}</span>
                </span>
                <span className="mono faint" style={{ fontSize: 10.5 }}>{who}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(-1)
  const [scrolled, setScrolled] = useState(false)
  const [count, setCount] = useState(1284)

  useEffect(() => {
    const id = setInterval(() => setCount(v => v + (Math.random() < 0.4 ? 1 : 0)), 2600)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const root = scrollRef.current; if (!root) return
    const onScroll = () => setScrolled(root.scrollTop > 40)
    root.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => root.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const root = scrollRef.current; if (!root) return
    const secs = [...root.querySelectorAll('[data-stage]')] as HTMLElement[]
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActive(+(e.target as HTMLElement).dataset.stage!) })
    }, { root, rootMargin: '-46% 0px -46% 0px', threshold: 0 })
    secs.forEach(s => io.observe(s))
    const heroIo = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(-1) }, { root, rootMargin: '-30% 0px -60% 0px', threshold: 0 })
    const hero = root.querySelector('.lx-hero'); if (hero) heroIo.observe(hero)
    return () => { io.disconnect(); heroIo.disconnect() }
  }, [])

  const jump = (i: number) => {
    const root = scrollRef.current; if (!root) return
    const el = root.querySelector(`[data-stage="${i}"]`) as HTMLElement | null
    if (el) root.scrollTo({ top: el.offsetTop - 110, behavior: 'smooth' })
  }

  return (
    <div className="lx" ref={scrollRef}>
      <TopNav scrolled={scrolled} />
      <ExecutionTrace active={active} onJump={jump} hidden={scrolled} />

      <section className="lx-hero">
        <div className="lx-wrap">
          <div className="hero-grid">
            <div>
              <div className="hero-tag">
                <span className="pulse-dot up" style={{ width: 5, height: 5 }} />
                STANDING ORDER · LCT-0042 ·{' '}
                <span style={{ color: 'var(--up)' }}>ARMED</span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span>{count.toLocaleString()} mandates submitted</span>
              </div>
              <h1 className="lx-h1">State a thesis.<br /><span className="accent">LICTOR executes.</span></h1>
              <div className="hero-thesis">
                Buy <span className="tk">WSOMI</span> if Polymarket{' '}
                <span className="hl">&quot;BTC &gt; $100k&quot;</span> odds drop below 70%{' '}
                <span style={{ color: 'var(--text-lo)' }}>AND</span> ETH is above $4,000.
              </div>
              <div className="hero-status">
                <span className="row gap2"><span className="pulse-dot" style={{ width: 5, height: 5 }} />monitoring 2 signals</span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span>no operator in the loop</span>
              </div>
              <div className="hero-cta2">
                <a href="#/create" className="btn btn-primary btn-lg">Open the Desk <Icons.Arrow size={16} /></a>
                <a href="#/desk"   className="btn btn-secondary btn-lg"><Icons.Eye size={15} />Watch live execution</a>
              </div>
            </div>
            <div className="rv in"><LiveDesk /></div>
          </div>
          <div className="row gap3" style={{ marginTop: 'var(--s10)', alignItems: 'center', color: 'var(--text-lo)' }}>
            <span className="tick-rule" style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Follow one order through the system</span>
            <Icons.ChevronD size={14} />
            <span className="tick-rule" style={{ flex: 1 }} />
          </div>
        </div>
      </section>

      <ActSignal />
      <ActDebate />
      <ActConsensus />
      <ActCapital />
      <ActExecution />
      <ActReceipts />

      <section className="close-term">
        <div className="lx-wrap">
          <div className="act-marker" style={{ marginBottom: 'var(--s5)' }}>
            <span style={{ width: 18, height: 1, background: 'var(--accent-hi)', display: 'inline-block' }} />
            Issue your order
          </div>
          <h2 style={{ fontSize: 'clamp(32px,4.4vw,60px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, color: 'var(--text-hi)', maxWidth: '16ch', marginBottom: 'var(--s7)' }}>
            The desk is open. Write one sentence.
          </h2>
          <a href="#/create" className="term-prompt" style={{ textDecoration: 'none' }}>
            <span className="mono" style={{ color: 'var(--accent-hi)', fontSize: 16 }}>&gt;</span>
            <span className="mono" style={{ color: 'var(--text-lo)', fontSize: 15, flex: 1 }}>state your thesis<span className="caret" /></span>
            <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>Decompose <Icons.Arrow size={13} /></span>
          </a>
          <div className="row gap5 wrap" style={{ marginTop: 'var(--s7)' }}>
            {([['96.1%', 'execution success'], ['1.8s', 'median consensus'], ['$4.82M', 'volume routed'], ['5', 'agent calls / mandate']] as const).map(([n, l]) => (
              <div key={l} className="col" style={{ gap: 2 }}>
                <span className="readout" style={{ fontSize: 24 }}>{n}</span>
                <span className="label" style={{ fontSize: 9.5 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="lx-foot">
        <span className="row gap2"><Icons.Logo size={16} />LICTOR · LIVE ON SOMNIA MAINNET</span>
        <span>STATE A THESIS. AGENTS EXECUTE.</span>
      </footer>
    </div>
  )
}
