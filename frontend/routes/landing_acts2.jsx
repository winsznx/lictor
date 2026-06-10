/* ============================================================
   LICTOR — Landing v2 acts (cont.)
   05 Execution · 06 Receipts
   ============================================================ */
const { useInView, Reveal, ActHead } = window.ACTS;

/* ============================================================
   ACT 05 — EXECUTION OCCURS  (the decisive flip)
   ============================================================ */
function ActExecution() {
  const [ref, inV] = useInView({ threshold: 0.12, margin: '0px 0px -12% 0px' });
  const [phase, setPhase] = useState(0); // 0 armed, 1 executing, 2 executed
  useEffect(() => {
    if (!inV) return;
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [inV]);
  return (
    <section className="act" data-stage="4">
      <div className="lx-wrap">
        <ActHead num="05" marker="Execution"
          title="No human approves the trade."
          sub="The contract decodes the calldata, validates the selector, and calls the router. From trigger to settlement, there is no operator in the loop — only consensus." />
        <Reveal d="1" className="exec-hero reg" >
          <div ref={ref} className="row between wrap" style={{ gap: 'var(--s7)', alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 'var(--s5)', minWidth: 260 }}>
              <div className="row gap3" style={{ alignItems: 'center' }}>
                <span className="mono faint" style={{ fontSize: 12 }}>LCT-0042</span>
                <I.Arrow size={14} style={{ color: 'var(--text-faint)' }} />
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
                <span className="mono" style={{ fontSize: 16, color: 'var(--text-mid)' }}>SOMI</span>
                <span className="mono faint" style={{ fontSize: 12 }}>filled · 0.5% slippage</span>
              </div>
            </div>
            <div className="col gap3" style={{ minWidth: 260, flex: 1 }}>
              {[
                ['route', 'QuickSwap V4 · USDC→SOMI'],
                ['settlement tx', '0x88fe…11a9'],
                ['block', '8,412,774'],
                ['gas', '0.0019 STT'],
                ['receipt', 'rcp_8842'],
              ].map(([k, v], i) => (
                <div key={k} className="row between" style={{ borderBottom: '1px solid var(--border-mute)', paddingBottom: 9, opacity: phase >= 2 ? 1 : 0.25, transition: `opacity 0.4s ${i * 80}ms` }}>
                  <span className="mono faint" style={{ fontSize: 11 }}>{k}</span>
                  <span className="mono" style={{ fontSize: 12, color: k === 'settlement tx' || k === 'receipt' ? 'var(--accent-hi)' : 'var(--text-hi)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* progress sweep */}
          <div className="meter" style={{ marginTop: 'var(--s7)', height: 3 }}>
            <span style={{ width: phase === 0 ? '8%' : phase === 1 ? '64%' : '100%', background: phase >= 2 ? 'var(--up)' : 'var(--accent-hi)', transition: 'width 1.2s var(--ease-out), background 0.4s' }} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   ACT 06 — RECEIPTS GENERATED  (the proof trail)
   ============================================================ */
function ActReceipts() {
  const trail = [
    { id: 'rcp_8821', agent: 'decomposer', step: 'Decompose thesis', cons: 0.94, res: 'Success', lat: 1840 },
    { id: 'rcp_8822', agent: 'json', step: 'Fetch ETH spot', cons: 0.99, res: 'Success', lat: 720 },
    { id: 'rcp_8831', agent: 'parse', step: 'Fetch BTC>100k odds', cons: 0.91, res: 'Success', lat: 2110 },
    { id: 'rcp_8841', agent: 'executor', step: 'Yield swap calldata', cons: 0.96, res: 'Success', lat: 1530 },
    { id: 'rcp_8842', agent: null, step: 'Settle on QuickSwap V4', cons: 1.00, res: 'Success', lat: 410 },
  ];
  return (
    <section className="act" data-stage="5">
      <div className="lx-wrap">
        <ActHead num="06" marker="Receipts"
          title="And every step left something you can open."
          sub="Not a screenshot. Not a log line on someone's server. Each agent call is a consensus receipt on the Somnia Agents platform — the request, the responses, the finalized bytes." />
        <Reveal d="1" className="ledger reg">
          <div className="ledger-row hd">
            <span>Request</span><span>Step</span><span className="lc-hide">Consensus</span><span className="lc-hide">Latency</span><span className="lc-hide">Result</span><span></span>
          </div>
          {trail.map((r, i) => (
            <div key={r.id} className="ledger-row" style={{ cursor: 'pointer' }}>
              <span style={{ color: 'var(--accent-hi)' }}>{r.id}</span>
              <span className="row gap2" style={{ minWidth: 0 }}>
                {r.agent ? <UI.AgentChip agent={r.agent} size={15} /> : <span style={{ width: 15, height: 15, borderRadius: 3, background: 'var(--up-soft)', border: '1px solid var(--up-line)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><I.Check size={9} style={{ color: 'var(--up)' }} /></span>}
                <span style={{ color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.step}</span>
              </span>
              <span className="lc-hide" style={{ color: 'var(--up)' }}>{(r.cons * 100).toFixed(0)}%</span>
              <span className="lc-hide faint">{r.lat}ms</span>
              <span className="lc-hide" style={{ color: 'var(--up)' }}>● {r.res}</span>
              <span style={{ textAlign: 'right' }}><I.External size={12} style={{ color: 'var(--text-faint)', display: 'inline' }} /></span>
            </div>
          ))}
        </Reveal>

        {/* the wedge — stated, not marketed */}
        <Reveal d="2" className="row between wrap" style={{ marginTop: 'var(--s10)', gap: 'var(--s7)', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 420px' }}>
            <span className="act-marker"><span style={{ width: 18, height: 1, background: 'var(--accent-hi)' }} />Why only on Somnia</span>
            <p style={{ fontSize: 'clamp(20px,2.2vw,30px)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.3, color: 'var(--text-hi)', marginTop: 'var(--s4)', maxWidth: '20ch' }}>
              Other chains run the AI off-chain and ask you to trust an attestation.
            </p>
            <p className="act-sub" style={{ maxWidth: '42ch' }}>Somnia runs the model on its validators and reaches consensus on the exact output. The decision <span style={{ color: 'var(--text-hi)' }}>is</span> the consensus. That's the whole product.</p>
          </div>
          <div className="instr" style={{ flex: '1 1 360px', padding: 0 }}>
            {[
              ['Decision made on-chain', 'lictor', true],
              ['Plain-English mandate', 'lictor', true],
              ['Off-chain bot + oracle', 'everyone else', false],
              ['Trust an operator', 'everyone else', false],
            ].map(([t, who, ours], i) => (
              <div key={i} className="row between" style={{ padding: 'var(--s4) var(--s5)', borderBottom: i < 3 ? '1px solid var(--border-faint)' : 'none' }}>
                <span className="row gap3">
                  {ours ? <I.Check size={15} style={{ color: 'var(--up)' }} /> : <I.X size={14} style={{ color: 'var(--text-faint)' }} />}
                  <span style={{ fontSize: 13.5, color: ours ? 'var(--text-hi)' : 'var(--text-mid)' }}>{t}</span>
                </span>
                <span className="mono faint" style={{ fontSize: 10.5 }}>{who}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

Object.assign(window.ACTS, { ActExecution, ActReceipts });
