import React from 'react'
import { Topbar } from '../app/shell'
import { explorerAddress } from '../lib/chain'
import { useChainCfg } from '../hooks/useChainCfg'
import * as Icons from '../app/icons'

export default function Docs() {
  const cfg = useChainCfg()
  return (
    <>
      <Topbar title="Documentation" sub="Architecture, agent protocol, contract interface" />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 860 }}>

          <div className="col gap6">
            <Section title="Overview">
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65 }}>
                LICTOR is a plain-English autonomous trading desk running on Somnia's Agentic L1. You submit a trade thesis — the multi-agent flow decomposes it into measurable signals, monitors them against on-chain sources, and executes the swap when conditions are met.
              </p>
            </Section>

            <Section title="How it works">
              <div className="col gap4">
                {[
                  ['1. Submit thesis', 'Call submitMandate(thesis, tokenIn, tokenOut, amountIn, minOut). Your STT budget is escrowed.'],
                  ['2. Decompose', 'The Decomposer agent (LLM Inference, Qwen3-30B) parses your thesis into a structured signal array via inferString.'],
                  ['3. Monitor', 'JSON API and Parse Website agents tick each signal at the REFRESH_INTERVAL (60s). Results are finalized via validator consensus.'],
                  ['4. Execute', 'When all signals trigger, the Executor agent calls executeSwap via inferToolsChat. The contract validates and executes the Algebra swap.'],
                ].map(([t, d]) => (
                  <div key={t} className="panel" style={{ padding: 'var(--s4)' }}>
                    <div className="h4" style={{ fontSize: 13.5, marginBottom: 4 }}>{t}</div>
                    <p className="muted sm" style={{ lineHeight: 1.55 }}>{d}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Contract interface">
              <div className="panel" style={{ overflow: 'hidden' }}>
                <table className="tbl">
                  <thead><tr><th>Function</th><th>Description</th></tr></thead>
                  <tbody>
                    {[
                      ['submitMandate(thesis, tokenIn, tokenOut, amountIn, minOut)', 'Create and arm a mandate. Sends STT budget as msg.value.'],
                      ['tick(mandateId)', 'Manually dispatch signal agents for a mandate.'],
                      ['executeIfReady(mandateId)', 'Attempt execution if all signals triggered.'],
                      ['closeMandate(mandateId)', 'Cancel monitoring and reclaim remaining budget.'],
                      ['getMandate(mandateId)', 'Returns full Mandate struct with all fields.'],
                      ['getSignals(mandateId)', 'Returns Signal[] array for the mandate.'],
                    ].map(([fn, desc]) => (
                      <tr key={fn}>
                        <td><span className="mono" style={{ fontSize: 11.5 }}>{fn}</span></td>
                        <td><span className="muted sm">{desc}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Deployed contracts">
              <dl className="kv panel" style={{ padding: 'var(--s5)' }}>
                <dt>Lictor.sol</dt>
                <dd><a href={explorerAddress(cfg.lictor, cfg.chainId)} target="_blank" rel="noopener noreferrer" className="mono row gap2" style={{ fontSize: 12, color: 'var(--accent-hi)' }}>{cfg.lictor}<Icons.External size={12} /></a></dd>
                <dt>Network</dt>
                <dd className="mono">{cfg.isMainnet ? 'Somnia mainnet' : 'Shannon testnet'} · chainId {cfg.chainId}</dd>
              </dl>
            </Section>
          </div>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="h3" style={{ marginBottom: 'var(--s4)' }}>{title}</h2>
      {children}
    </div>
  )
}
