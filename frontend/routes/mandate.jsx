/* ============================================================
   LICTOR — Mandate Details (the centerpiece app screen)
   ============================================================ */
const PHASE_META = {
  SUBMITTED:  { ic: 'Plus',   cls: 'done', label: 'Submitted' },
  DECOMPOSED: { ic: 'Layers', cls: 'done', label: 'Decomposed' },
  MONITORING: { ic: 'Signal', cls: 'done', label: 'Monitoring' },
  TRIGGERED:  { ic: 'Bolt',   cls: 'done', label: 'Triggered' },
  EXECUTING:  { ic: 'Refresh',cls: 'live', label: 'Executing' },
  EXECUTED:   { ic: 'Check',  cls: 'done', label: 'Executed' },
  FAILED:     { ic: 'X',      cls: 'fail', label: 'Failed' },
};

function MandateDetail({ id, onCmd }) {
  UI.useLive();
  const m = L().getMandate(id);
  const [drawer, setDrawer] = useState(null);
  if (!m) return <div className="page"><div className="empty"><div className="empty-ico"><I.X size={20}/></div><span className="muted">Mandate {id} not found</span><a href="#/desk" className="btn btn-secondary btn-sm">Back to desk</a></div></div>;
  const events = L().buildTimeline(m);
  const trg = m.signals.filter(s => s.triggered).length;

  return (
    <>
      <SHELL.Topbar title={<span className="row gap3"><a href="#/desk" className="mono" style={{ color: 'var(--text-lo)', fontSize: 13 }}>desk</a><span className="faint">/</span><span className="mono">{m.code}</span></span>}
        onCmd={onCmd}
        actions={<><button className="btn btn-ghost btn-sm"><I.Eye size={14} />Public</button><button className="btn btn-secondary btn-sm"><I.Refresh size={13} />Tick now</button></>} />
      <div className="page">
        <div className="page-pad-wide" style={{ maxWidth: 1320, margin: '0 auto' }}>
          {/* HEADER */}
          <div className="row between wrap" style={{ gap: 'var(--s5)', marginBottom: 'var(--s7)' }}>
            <div className="col" style={{ gap: 'var(--s4)', maxWidth: 680 }}>
              <div className="row gap3">
                <UI.StatusBadge status={m.status} />
                <span className="mono faint" style={{ fontSize: 12 }}>{m.code}</span>
                <span className="mono faint" style={{ fontSize: 12 }}>· created {L().fmtAgo(m.createdAt)}</span>
                <span className="row gap2"><span className="mono faint" style={{ fontSize: 12 }}>· by</span><span className="mono" style={{ fontSize: 12, color: 'var(--text-mid)' }}>{m.owner}</span></span>
              </div>
              <h1 className="h2" style={{ fontWeight: 560, lineHeight: 1.25, letterSpacing: '-0.018em' }}>{m.thesis}</h1>
            </div>
            <div className="row gap3">
              <a href="#/consensus" className="btn btn-secondary btn-sm"><I.Nodes size={14} />Consensus</a>
              {m.status === 'EXECUTING' && <button className="btn btn-primary btn-sm"><span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />Executing</button>}
              {m.status === 'ARMED' && <button className="btn btn-secondary btn-sm">Pause</button>}
            </div>
          </div>

          {/* SUMMARY STRIP */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 'var(--s7)' }}>
            <SumCell label="Trade" value={<UI.TokenPair inT={m.tokenIn} outT={m.tokenOut} />} />
            <SumCell label="Amount" value={<span className="mono">{L().fmtNum(m.amountIn)} {m.tokenIn}</span>} />
            <SumCell label="Budget" value={<span className="mono">{m.budget} STT</span>} />
            <SumCell label="Signals" value={<span className="mono">{trg}/{m.signals.length} met</span>} />
            <SumCell label="Consensus" value={m.consensus ? <span className="mono" style={{ color: 'var(--up)' }}>{(m.consensus*100).toFixed(0)}%</span> : '—'} />
          </div>

          <div className="row gap6" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* LEFT: Timeline */}
            <div style={{ flex: '1 1 540px', minWidth: 0 }}>
              <div className="sec-head"><div className="sec-title"><h2 className="h3">Agent timeline</h2>{m.status==='EXECUTING' && <span className="pulse-dot" />}</div>
                <span className="mono faint" style={{ fontSize: 11 }}>{events.length} events</span></div>
              <div className="tl">
                {events.map((ev, i) => <TimelineItem key={i} ev={ev} idx={i} onReceipt={(r) => setDrawer(r)} />)}
              </div>
            </div>

            {/* RIGHT: signals + consensus + receipts */}
            <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
              <div>
                <div className="sec-head"><div className="sec-title"><h2 className="h3">Signals</h2></div><a href="#/signals" className="mono faint" style={{ fontSize: 11 }}>monitor →</a></div>
                <div className="col gap4">
                  {m.signals.length === 0
                    ? <div className="panel"><div className="empty" style={{ padding: 'var(--s7)' }}><span className="spinner" /><span className="muted sm">Awaiting decomposition…</span></div></div>
                    : m.signals.map(s => <BLOCKS.SignalCard key={s.id} s={s} />)}
                </div>
              </div>

              {m.consensus != null && (
                <div>
                  <div className="sec-head"><div className="sec-title"><h2 className="h3">Consensus layer</h2></div></div>
                  <div className="panel" style={{ padding: 'var(--s6)' }}>
                    <UI.ConsensusViz value={m.consensus} validators={3} size="sm" />
                    <div className="divider" style={{ margin: 'var(--s5) 0' }} />
                    <div className="row between"><span className="label">Mechanism</span><span className="mono faint" style={{ fontSize: 11 }}>temp 0 · fixed seed</span></div>
                    <div className="row between" style={{ marginTop: 8 }}><span className="label">Subcommittee</span><span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>3 validators</span></div>
                  </div>
                </div>
              )}

              {/* receipts */}
              <div>
                <div className="sec-head"><div className="sec-title"><h2 className="h3">Receipts</h2></div><a href="#/receipts" className="mono faint" style={{ fontSize: 11 }}>all →</a></div>
                <div className="panel">
                  {events.filter(e => e.receipt).map((e, i) => (
                    <div key={i} className="feed-row lrow" style={{ gridTemplateColumns: '30px 1fr auto' }} onClick={() => setDrawer({ id: e.receipt, phase: e.phase, agent: e.agent, consensus: e.consensus, at: e.at, tx: e.tx })}>
                      <div className="feed-ico" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-mid)' }}><I.Receipt size={14} /></div>
                      <div className="col" style={{ gap: 1 }}>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>{e.receipt}</span>
                        <span className="mono faint" style={{ fontSize: 10.5 }}>{PHASE_META[e.phase]?.label}</span>
                      </div>
                      <I.Chevron size={14} style={{ color: 'var(--text-faint)' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {drawer && <ReceiptDrawer r={drawer} onClose={() => setDrawer(null)} />}
    </>
  );
}

function SumCell({ label, value }) {
  return (
    <div style={{ padding: 'var(--s4) var(--s5)' }}>
      <div className="label" style={{ fontSize: 9.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-hi)' }}>{value}</div>
    </div>
  );
}

function TimelineItem({ ev, idx, onReceipt }) {
  const [open, setOpen] = useState(ev.live || idx === 0);
  const meta = PHASE_META[ev.phase] || PHASE_META.SUBMITTED;
  const Ic = I[meta.ic];
  const a = ev.agent ? L().AGENTS[ev.agent] : null;
  return (
    <div className="tl-item" style={{ animation: `fadeUp 0.4s var(--ease-out) ${idx*60}ms both` }}>
      <div className="tl-rail">
        <div className={`tl-node ${meta.cls}`}>
          {ev.live ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Ic size={13} />}
        </div>
        <div className={`tl-line ${meta.cls === 'done' ? 'done' : ''}`} />
      </div>
      <div className="tl-body">
        <div className="tl-card">
          <div className="tl-card-hd" onClick={() => setOpen(o => !o)}>
            <span className="h4" style={{ fontSize: 14 }}>{meta.label}</span>
            {a && <UI.AgentChip agent={ev.agent} size={16} showName />}
            {ev.live && <span className="badge is-live" style={{ height: 18 }}><span className="pulse-dot" style={{ width: 4, height: 4 }} />live</span>}
            <div className="grow" />
            <span className="mono faint" style={{ fontSize: 11 }}>{L().fmtAgo(ev.at)}</span>
            <I.ChevronD size={14} style={{ color: 'var(--text-lo)', transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.18s var(--ease)' }} />
          </div>
          {open && (
            <div className="tl-card-body">
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55, padding: 'var(--s3) 0' }}>{ev.txt}</p>
              <div className="row gap3 wrap" style={{ marginTop: 4 }}>
                {ev.consensus != null && (
                  <span className="badge is-armed" style={{ height: 24 }}><I.Shield size={11} />{(ev.consensus*100).toFixed(0)}% · {ev.validators || 3}/3 validators</span>
                )}
                {ev.tx && (
                  <span className="badge" style={{ height: 24 }}>
                    <I.External size={11} /><span className="mono">{ev.tx}</span>
                  </span>
                )}
                {ev.receipt && (
                  <button className="btn btn-secondary btn-sm" onClick={() => onReceipt({ id: ev.receipt, phase: ev.phase, agent: ev.agent, consensus: ev.consensus, at: ev.at, tx: ev.tx })}>
                    <I.Receipt size={12} />Inspect receipt
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Receipt inspector drawer ---- */
function ReceiptDrawer({ r, onClose }) {
  const a = r.agent ? L().AGENTS[r.agent] : null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-hd">
          <div className="row gap3">
            <div className="feed-ico" style={{ background: 'var(--accent-softer)', border: '1px solid var(--accent-line)', color: 'var(--accent-hi)' }}><I.Receipt size={15} /></div>
            <div className="col" style={{ gap: 1 }}>
              <span className="mono" style={{ fontSize: 14, color: 'var(--text-hi)' }}>{r.id}</span>
              <span className="mono faint" style={{ fontSize: 11 }}>{PHASE_META[r.phase]?.label || 'Agent receipt'}</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><I.X size={16} /></button>
        </div>
        <div className="drawer-body">
          <div className="row gap2" style={{ marginBottom: 'var(--s5)' }}>
            <span className="badge is-armed"><I.Check size={10} />Success</span>
            {r.consensus != null && <span className="badge is-live"><I.Shield size={10} />{(r.consensus*100).toFixed(0)}% consensus</span>}
          </div>
          <dl className="kv" style={{ marginBottom: 'var(--s6)' }}>
            <dt>Request ID</dt><dd className="mono row gap2">{r.id}<UI.CopyBtn text={r.id} /></dd>
            {a && <><dt>Agent</dt><dd><UI.AgentChip agent={r.agent} size={16} showName /></dd></>}
            {a && <><dt>Model</dt><dd className="mono">{a.model}</dd></>}
            <dt>Subcommittee</dt><dd className="mono">3 validators</dd>
            <dt>Finalized</dt><dd className="mono">{new Date(r.at).toLocaleTimeString()}</dd>
            {r.tx && <><dt>Settlement tx</dt><dd className="mono row gap2" style={{ color: 'var(--accent-hi)' }}>{r.tx}<I.External size={12} /></dd></>}
          </dl>

          <div className="label" style={{ marginBottom: 'var(--s3)' }}>Validator responses</div>
          <div className="panel" style={{ marginBottom: 'var(--s6)' }}>
            {L().VALIDATORS.slice(0,3).map((v,i) => (
              <div key={v.id} className="row between" style={{ padding: 'var(--s3) var(--s4)', borderBottom: i<2?'1px solid var(--border-faint)':'none' }}>
                <span className="row gap2"><span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--up-soft)', border: '1px solid var(--up-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.Check size={9} style={{ color: 'var(--up)' }} /></span><span className="mono" style={{ fontSize: 12 }}>{v.label}</span><span className="mono faint" style={{ fontSize: 10 }}>{v.region}</span></span>
                <span className="mono faint" style={{ fontSize: 11 }}>matched · {(820+i*140)}ms</span>
              </div>
            ))}
          </div>

          <div className="label" style={{ marginBottom: 'var(--s3)' }}>Response payload</div>
          <pre className="code">{`{
  `}<span className="c">// finalized output (consensus bytes)</span>{`
  `}<span className="k">"finishReason"</span>{`: `}<span className="s">"tool_calls"</span>{`,
  `}<span className="k">"toolCalls"</span>{`: [{
    `}<span className="k">"name"</span>{`: `}<span className="s">"executeSwap"</span>{`,
    `}<span className="k">"args"</span>{`: {
      `}<span className="k">"tokenIn"</span>{`:  `}<span className="s">"0xA0b8…eB48"</span>{`,
      `}<span className="k">"tokenOut"</span>{`: `}<span className="s">"0x5cc7…91Ed"</span>{`,
      `}<span className="k">"amountIn"</span>{`: `}<span className="n">500000000</span>{`,
      `}<span className="k">"minOut"</span>{`:   `}<span className="n">41160000</span>{`
    }
  }]
}`}</pre>
        </div>
      </div>
    </>
  );
}

window.ROUTES = window.ROUTES || {};
window.ROUTES.MandateDetail = MandateDetail;
window.ROUTES._ReceiptDrawer = ReceiptDrawer;
