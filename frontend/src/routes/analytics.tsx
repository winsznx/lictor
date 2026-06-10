import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Topbar } from '../app/shell'
import { AreaChart, BarChart, Ring } from '../app/ui'
import { useMandates } from '../hooks/useMandates'
import { tokenDecimals } from '../lib/chain'

export default function Analytics() {
  const { data: mandates = [] } = useMandates()

  const executed = mandates.filter(m => m.statusLabel === 'EXECUTED').length
  const failed = mandates.filter(m => m.statusLabel === 'FAILED').length
  const total = mandates.length
  const successRate = total > 0 ? executed / total : 0

  // Real BTC price history (7d) from the same public source the JSON API agent reads.
  // Client-side fetch, no backend of ours — falls back to a notice if the API is unreachable.
  const { data: btcSeries = [], isLoading: btcLoading, isError: btcError } = useQuery({
    queryKey: ['btc-7d'],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async (): Promise<number[]> => {
      const r = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7')
      if (!r.ok) throw new Error('price fetch failed')
      const j = (await r.json()) as { prices?: [number, number][] }
      return (j.prices ?? []).map(p => p[1])
    },
  })

  // Real trade volume: input amount per mandate (newest first).
  const volumeSeries = useMemo(
    () => mandates.map(m => Number(m.amountIn) / Math.pow(10, tokenDecimals(m.tokenIn))).reverse(),
    [mandates],
  )

  return (
    <>
      <Topbar title="Analytics" sub="Mandate performance · live market data" />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 1100 }}>

          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 'var(--s8)' }}>
            <Stat label="Total mandates" value={total.toString()} />
            <Stat label="Executed" value={executed.toString()} tone="up" />
            <Stat label="Failed" value={failed.toString()} />
            <Stat label="Success rate" value={total > 0 ? (successRate * 100).toFixed(0) + '%' : '—'} tone={successRate > 0.7 ? 'up' : undefined} />
          </div>

          <div className="row gap6 wrap" style={{ alignItems: 'flex-start', marginBottom: 'var(--s8)' }}>
            <div style={{ flex: '1 1 520px', minWidth: 0 }}>
              <div className="sec-head"><div className="sec-title"><h2 className="h3">BTC price · 7d</h2></div></div>
              <div className="panel" style={{ padding: 'var(--s5)' }}>
                {btcLoading ? (
                  <div className="empty" style={{ padding: 'var(--s7)' }}><span className="spinner" /><span className="muted sm">Loading price…</span></div>
                ) : btcError || btcSeries.length === 0 ? (
                  <div className="empty" style={{ padding: 'var(--s7)' }}><span className="muted sm">Live price unavailable right now</span></div>
                ) : (
                  <AreaChart data={btcSeries} h={180} />
                )}
              </div>
            </div>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <div className="sec-head"><div className="sec-title"><h2 className="h3">Mandate outcomes</h2></div></div>
              <div className="panel" style={{ padding: 'var(--s6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--s6)' }}>
                <Ring value={successRate} size={96} stroke={8} label={(successRate * 100).toFixed(0) + '%'} sub="executed" color="var(--up)" />
                <div className="col gap3">
                  <LegendRow color="var(--up)" label="Executed" count={executed} />
                  <LegendRow color="var(--down)" label="Failed" count={failed} />
                  <LegendRow color="var(--text-faint)" label="Active" count={total - executed - failed} />
                </div>
              </div>
            </div>
          </div>

          <div className="sec-head"><div className="sec-title"><h2 className="h3">Trade volume · by mandate (USDC.e in)</h2></div></div>
          <div className="panel" style={{ padding: 'var(--s5)' }}>
            {volumeSeries.length > 0 ? (
              <BarChart data={volumeSeries} h={140} />
            ) : (
              <div className="empty" style={{ padding: 'var(--s7)' }}><span className="muted sm">No trades yet — submit a mandate to see volume here.</span></div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone === 'up' ? { color: 'var(--up)' } : undefined}>{value}</div>
    </div>
  )
}

function LegendRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="row gap2">
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />
      <span className="sm" style={{ color: 'var(--text-mid)' }}>{label}</span>
      <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)', marginLeft: 'auto' }}>{count}</span>
    </div>
  )
}
