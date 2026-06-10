import { useState, useMemo } from 'react'
import { AGENTS, fmtNum, signalDistance, fmtAgo } from '../lib/utils'
import type { DisplaySignal } from '../hooks/useMandates'
import * as Icons from './icons'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { cls: string; label: string }> = {
  PENDING:   { cls: 'is-pending', label: 'Parsing thesis…' },
  ARMED:     { cls: 'is-armed',   label: 'Watching markets' },
  TRIGGERED: { cls: 'is-exec',    label: 'Conditions met' },
  EXECUTING: { cls: 'is-exec',    label: 'Executing trade' },
  EXECUTED:  { cls: 'is-armed',   label: 'Trade executed ✓' },
  FAILED:    { cls: 'is-failed',  label: 'Failed' },
  CLOSED:    { cls: 'is-idle',    label: 'Closed' },
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING
  const showPulse = status === 'EXECUTING' || status === 'TRIGGERED'
  return (
    <span className={`badge ${meta.cls}`}>
      {showPulse
        ? <span className="pulse-dot" style={{ width: 5, height: 5 }} />
        : <span className="dot" />}
      {meta.label}
    </span>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

type SparklineProps = {
  data: number[]
  w?: number
  h?: number
  threshold?: number
  color?: string
  fill?: boolean
  strokeW?: number
  glow?: boolean
}

export function Sparkline({ data, w = 120, h = 32, threshold, color, fill = true, strokeW = 1.5, glow }: SparklineProps) {
  const result = useMemo(() => {
    if (!data || data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = (max - min) || 1
    const pad = range * 0.12
    const lo = min - pad, hi = max + pad, rng = hi - lo
    const X = (i: number) => (i / (data.length - 1)) * w
    const Y = (v: number) => h - ((v - lo) / rng) * h
    let path = `M ${X(0).toFixed(1)} ${Y(data[0]).toFixed(1)}`
    for (let i = 1; i < data.length; i++) path += ` L ${X(i).toFixed(1)} ${Y(data[i]).toFixed(1)}`
    const areaPath = path + ` L ${w} ${h} L 0 ${h} Z`
    const thY = threshold != null ? Y(threshold) : null
    const last = { x: X(data.length - 1), y: Y(data[data.length - 1]) }
    return { path, areaPath, thY, last }
  }, [data, w, h, threshold])

  const gid = useMemo(() => 'sg' + Math.random().toString(36).slice(2, 8), [])

  if (!result) return <div style={{ width: w, height: h }} />
  const c = color || 'var(--accent-hi)'
  const { path, areaPath, thY, last } = result

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.20" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {thY != null && <line x1="0" y1={thY} x2={w} y2={thY} stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="2 3" />}
      {fill && <path d={areaPath} fill={`url(#${gid})`} />}
      <path d={path} fill="none" stroke={c} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"
        style={glow ? { filter: `drop-shadow(0 0 4px ${c})` } : undefined} />
      <circle cx={last.x} cy={last.y} r="2.2" fill={c} />
      <circle cx={last.x} cy={last.y} r="2.2" fill={c}>
        <animate attributeName="r" values="2.2;5;2.2" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ─── Area chart ───────────────────────────────────────────────────────────────

export function AreaChart({ data, w = 600, h = 200, color, threshold }: {
  data: number[]
  w?: number
  h?: number
  color?: string
  threshold?: number
}) {
  const c = color || 'var(--accent-hi)'
  const gid = useMemo(() => 'ac' + Math.random().toString(36).slice(2, 8), [])
  const { path, area, thY, pts } = useMemo(() => {
    const min = Math.min(...data), max = Math.max(...data)
    const range = (max - min) || 1, pad = range * 0.15
    const lo = min - pad, hi = max + pad, rng = hi - lo
    const X = (i: number) => (i / (data.length - 1)) * w
    const Y = (v: number) => h - ((v - lo) / rng) * h
    let path = `M ${X(0)} ${Y(data[0])}`
    data.forEach((v, i) => { if (i) path += ` L ${X(i).toFixed(1)} ${Y(v).toFixed(1)}` })
    return {
      path,
      area: path + ` L ${w} ${h} L 0 ${h} Z`,
      thY: threshold != null ? Y(threshold) : null,
      pts: { x: X(data.length - 1), y: Y(data[data.length - 1]) },
    }
  }, [data, w, h, threshold])

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="var(--border-faint)" strokeWidth="1" />)}
      {thY != null && <line x1="0" y1={thY} x2={w} y2={thY} stroke="var(--warn)" strokeWidth="1" strokeDasharray="3 4" opacity="0.8" />}
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts.x} cy={pts.y} r="3" fill={c} />
    </svg>
  )
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

export function BarChart({ data, w = 600, h = 160, color }: {
  data: number[]
  w?: number
  h?: number
  color?: string
}) {
  const c = color || 'var(--accent)'
  const max = Math.max(...data) || 1
  const bw = w / data.length
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((v, i) => {
        const bh = (v / max) * (h - 8)
        return (
          <rect key={i} x={i * bw + bw * 0.18} y={h - bh} width={bw * 0.64} height={bh} rx="1.5"
            fill={i === data.length - 1 ? 'var(--accent-hi)' : c}
            opacity={i === data.length - 1 ? 1 : 0.55} />
        )
      })}
    </svg>
  )
}

// ─── Ring gauge ───────────────────────────────────────────────────────────────

export function Ring({ value, size = 64, stroke = 5, color, track, label, sub }: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  label?: string
  sub?: string
}) {
  const c = color || 'var(--accent-hi)'
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const off = circ * (1 - value)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || 'var(--surface-3)'} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s var(--ease-out)' }} />
      </svg>
      {label != null && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="mono" style={{ fontSize: size * 0.26, fontWeight: 500, color: 'var(--text-hi)', lineHeight: 1 }}>{label}</span>
          {sub && <span className="label" style={{ fontSize: 8, marginTop: 2 }}>{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Agent chip ───────────────────────────────────────────────────────────────

export function AgentChip({ agent, size = 22, showName, dim }: {
  agent: string
  size?: number
  showName?: boolean
  dim?: boolean
}) {
  const a = AGENTS[agent] ?? { glyph: '?', name: agent, color: 'var(--text-lo)' }
  return (
    <span className="row gap2" style={{ opacity: dim ? 0.6 : 1 }}>
      <span style={{
        width: size, height: size, borderRadius: 'var(--r-xs)', flex: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${a.color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${a.color} 32%, transparent)`,
        color: a.color, fontFamily: 'var(--font-mono)', fontSize: size * 0.42, fontWeight: 500,
      }}>
        {a.glyph}
      </span>
      {showName && <span className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--text-mid)' }}>{a.name}</span>}
    </span>
  )
}

// ─── Token pair ───────────────────────────────────────────────────────────────

export function TokenPair({ inT, outT }: { inT: string; outT: string }) {
  return (
    <span className="row gap2 mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--text-mid)' }}>
      <span style={{ color: 'var(--text)' }}>{inT}</span>
      <Icons.Arrow size={11} style={{ color: 'var(--text-faint)' }} />
      <span style={{ color: 'var(--text)' }}>{outT}</span>
    </span>
  )
}

// ─── Consensus visualization ──────────────────────────────────────────────────

export function ConsensusViz({ value = 0.92, validators = 5, size = 'lg', animate = true }: {
  value?: number
  validators?: number
  size?: 'lg' | 'sm'
  animate?: boolean
}) {
  const vlist = Array.from({ length: validators })
  const agreeing = Math.round(value * validators)
  const big = size === 'lg'
  return (
    <div className="col gap4">
      <div className="row gap3 wrap">
        {vlist.map((_, i) => {
          const agree = i < agreeing
          return (
            <div key={i} className="col gap2" style={{ alignItems: 'center', animation: animate ? `fadeUp 0.5s var(--ease-out) ${i * 90}ms both` : 'none' }}>
              <div style={{ position: 'relative', width: big ? 46 : 34, height: big ? 46 : 34 }}>
                <svg width="100%" height="100%" viewBox="0 0 46 46">
                  <circle cx="23" cy="23" r="20"
                    fill={agree ? 'var(--up-soft)' : 'var(--surface-2)'}
                    stroke={agree ? 'var(--up-line)' : 'var(--border)'} strokeWidth="1.4" />
                  {agree
                    ? <path d="M16 23.5l5 5 9-11" fill="none" stroke="var(--up)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    : <circle cx="23" cy="23" r="3" fill="var(--text-faint)" />}
                  {agree && (
                    <circle cx="23" cy="23" r="20" fill="none" stroke="var(--up)" strokeWidth="1.4" opacity="0.5">
                      <animate attributeName="r" values="20;23;20" dur="2.4s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                    </circle>
                  )}
                </svg>
              </div>
              <span className="mono faint" style={{ fontSize: 9.5 }}>node {i + 1}</span>
            </div>
          )
        })}
      </div>
      <div className="row between" style={{ paddingTop: 'var(--s2)' }}>
        <span className="row gap2">
          <span className="mono" style={{ fontSize: big ? 26 : 18, fontWeight: 500, color: 'var(--up)', letterSpacing: '-0.02em' }}>
            {agreeing}/{validators}
          </span>
          <span className="label" style={{ alignSelf: 'flex-end', marginBottom: 4 }}>agreed</span>
        </span>
        <span className="col" style={{ alignItems: 'flex-end' }}>
          <span className="mono" style={{ fontSize: big ? 18 : 14, color: 'var(--text-hi)' }}>{(value * 100).toFixed(1)}%</span>
          <span className="label" style={{ fontSize: 8.5 }}>confidence</span>
        </span>
      </div>
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────

export function CopyBtn({ text, size = 13 }: { text: string; size?: number }) {
  const [done, setDone] = useState(false)
  return (
    <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => {
      e.stopPropagation()
      navigator.clipboard?.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1200)
    }}>
      {done
        ? <Icons.Check size={size} style={{ color: 'var(--up)' }} />
        : <Icons.Copy size={size} />}
    </button>
  )
}

// ─── Signal display helpers ───────────────────────────────────────────────────

export function fmtSig(s: DisplaySignal): string {
  const v = s.displayValue
  if (v >= 1_000_000) return fmtNum(v, 0)
  if (v >= 1000) return fmtNum(v, 0)
  return fmtNum(v, Math.min(s.decimals, 4))
}

export function fmtThresh(s: DisplaySignal): string {
  const v = s.displayThreshold
  if (v >= 1_000_000) return fmtNum(v, 0)
  if (v >= 1000) return fmtNum(v, 0)
  return fmtNum(v, Math.min(s.decimals, 4))
}

export function distance(s: DisplaySignal): number {
  return signalDistance(s.latestValue, s.threshold, s.comparator)
}

export { fmtAgo, fmtNum, STATUS_META }
