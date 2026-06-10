import { comparatorLabel, statusLabel, tokenSymbol, receiptUrl } from './chain'

// ─── Time formatting ──────────────────────────────────────────────────────────

export function fmtAgo(timestamp: bigint | number): string {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) * 1000 : timestamp
  if (ts === 0) return '—'
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

// ─── Number formatting ────────────────────────────────────────────────────────

export function fmtNum(value: number, decimals = 0): string {
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(value) >= 1_000) return value.toLocaleString('en-US', { maximumFractionDigits: decimals })
  return value.toFixed(decimals)
}

// ─── On-chain value display ───────────────────────────────────────────────────

export function displayValue(rawValue: bigint, decimals: number): number {
  if (decimals === 0) return Number(rawValue)
  return Number(rawValue) / Math.pow(10, decimals)
}

export function fmtSigValue(rawValue: bigint, decimals: number): string {
  const v = displayValue(rawValue, decimals)
  if (v >= 1000) return fmtNum(v, 0)
  return fmtNum(v, Math.min(decimals, 4))
}

export function fmtThreshValue(threshold: bigint, decimals: number): string {
  return fmtSigValue(threshold, decimals)
}

// ─── Mandate display helpers ──────────────────────────────────────────────────

export function mandateCode(id: bigint): string {
  return `LCT-${id.toString().padStart(4, '0')}`
}

// Fraction 0..1 of how close the signal is to triggering
export function signalDistance(latestValue: bigint, threshold: bigint, _comparator: number): number {
  const v = Number(latestValue)
  const t = Number(threshold)
  if (t === 0) return 0
  const span = Math.abs(t) * 0.06 || 1
  const d = Math.abs(v - t)
  return Math.max(0, Math.min(1, 1 - d / span))
}

// ─── Static agent metadata ────────────────────────────────────────────────────

export const AGENTS: Record<string, { glyph: string; name: string; color: string; model: string }> = {
  decomposer: { glyph: 'D', name: 'Decomposer', color: '#5b8af4', model: 'Qwen3-30B' },
  json: { glyph: 'J', name: 'JSON API', color: '#4ea585', model: 'JSON fetch' },
  parse: { glyph: 'P', name: 'Parse Web', color: '#c79a4e', model: 'Browser agent' },
  executor: { glyph: 'X', name: 'Executor', color: '#3d7bff', model: 'Qwen3-30B' },
}

// sourceType 0=JSON_API, 1=PARSE_WEBSITE
export function sourceTypeAgent(sourceType: number): 'json' | 'parse' {
  return sourceType === 1 ? 'parse' : 'json'
}

export const VALIDATORS = [
  { id: 'v1', label: 'val.asia1', region: 'SG' },
  { id: 'v2', label: 'val.eu1', region: 'EU' },
  { id: 'v3', label: 'val.us1', region: 'US' },
  { id: 'v4', label: 'val.asia2', region: 'JP' },
  { id: 'v5', label: 'val.eu2', region: 'DE' },
]

// ─── Sparkline series generator (for landing page animations) ─────────────────

export function generateSeries(start: number, variance: number, count: number, trend = 0): number[] {
  let v = start
  return Array.from({ length: count }, () => {
    v += (Math.random() - 0.5) * variance * 2 + trend
    return Math.max(0, v)
  })
}

// ─── Re-export helpers used across components ─────────────────────────────────

export { comparatorLabel, statusLabel, tokenSymbol, receiptUrl }
