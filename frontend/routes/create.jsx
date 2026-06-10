/* ============================================================
   LICTOR — Create Mandate (5-step premium flow)
   ============================================================ */
const STEPS = ['Write', 'Decompose', 'Confirm', 'Budget', 'Arm'];

function CreateMandate({ onCmd }) {
  const push = SHELL.useToast();
  const [step, setStep] = useState(0);
  const [thesis, setThesis] = useState(() => sessionStorage.getItem('lictor_draft') || '');
  const [decomposing, setDecomposing] = useState(false);
  const [tokIn] = useState('USDC');
  const [tokOut] = useState('SOMI');
  const [amount, setAmount] = useState(500);
  const [budget, setBudget] = useState(1.0);

  // parsed signals (mock decomposition result)
  const parsed = useMemo(() => ([
    { id: 'p1', label: 'BTC>100k odds', sourceType: 'PARSE_WEBSITE', agent: 'parse', source: 'polymarket.com', selector: 'market.bitcoin-100k-2026.yesPrice', comparator: 'LT', threshold: 0.70, decimals: 3, unit: '' },
    { id: 'p2', label: 'ETH spot', sourceType: 'JSON_API', agent: 'json', source: 'api.coinbase.com', selector: '$.data.amount', comparator: 'GT', threshold: 4000, decimals: 2, unit: '$' },
  ]), []);
  const [conjunctive] = useState(true);

  const goDecompose = () => {
    if (!thesis.trim()) { push({ kind: 'error', title: 'Write a thesis first' }); return; }
    setStep(1); setDecomposing(true);
    setTimeout(() => setDecomposing(false), 2600);
  };

  const arm = () => {
    push({ kind: 'success', title: 'Mandate armed', body: 'LCT-0045 · monitoring 2 signals' });
    sessionStorage.removeItem('lictor_draft');
    setTimeout(() => location.hash = '#/mandate/0042', 700);
  };

  const depositPerLLM = 0.24, depositPerSignal = 0.33, signalCount = parsed.length;
  const estSpend = (depositPerLLM * 2 + depositPerSignal * signalCount).toFixed(2);

  return (
    <>
      <SHELL.Topbar title="New mandate" sub="Compose · decompose · arm" onCmd={onCmd}
        actions={<a href="#/desk" className="btn btn-ghost btn-sm"><I.X size={14} />Cancel</a>} />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 860 }}>
          {/* stepper */}
          <div className="stepper" style={{ marginBottom: 'var(--s9)', justifyContent: 'center' }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <div className="step-conn" data-done={i <= step} />}
                <div className="step-dot" data-on={i === step} data-done={i < step}>
                  <span className="step-num">{i < step ? <I.Check size={12} /> : i + 1}</span>
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
                  placeholder="Buy SOMI if Polymarket “BTC > $100k” odds drop below 70% and ETH is above $4,000…" />
                <div className="composer-bar">
                  <button className="tok-pill"><span className="lbl">IN</span>{tokIn}<I.ChevronD size={12} style={{ color: 'var(--text-lo)' }} /></button>
                  <I.Arrow size={14} style={{ color: 'var(--text-faint)' }} />
                  <button className="tok-pill"><span className="lbl">OUT</span>{tokOut}<I.ChevronD size={12} style={{ color: 'var(--text-lo)' }} /></button>
                  <div className="grow" />
                  <button className="btn btn-primary btn-sm" onClick={goDecompose}>Decompose <I.Arrow size={13} /></button>
                </div>
              </div>
              <div className="row gap3" style={{ marginTop: 'var(--s4)', flexWrap: 'wrap' }}>
                <span className="mono faint" style={{ fontSize: 11 }}>Examples:</span>
                {['Short ETH if recession odds break 60% and ETH < $2,500','Buy SOMI if network surpasses 1M daily active addresses'].map(s => (
                  <button key={s} className="chip" onClick={() => setThesis(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — DECOMPOSE */}
          {step === 1 && (
            <div className="fade-up">
              <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>Agent decomposition</h2>
              <p className="muted" style={{ marginBottom: 'var(--s6)', fontSize: 14.5 }}>The Decomposer parses your thesis at the consensus layer. Structured output only — no exposed reasoning.</p>
              <div className="panel" style={{ padding: 'var(--s6)', marginBottom: 'var(--s5)' }}>
                <div className="row gap3" style={{ marginBottom: 'var(--s5)' }}>
                  <UI.AgentChip agent="decomposer" size={26} />
                  <div className="col" style={{ gap: 1 }}>
                    <span className="h4" style={{ fontSize: 14 }}>Decomposer</span>
                    <span className="mono faint" style={{ fontSize: 11 }}>inferString · Qwen3-30B · temp 0</span>
                  </div>
                  <div className="grow" />
                  {decomposing ? <span className="badge is-live"><span className="spinner" style={{ width: 11, height: 11 }} />parsing</span>
                    : <span className="badge is-armed"><I.Check size={10} />3/3 consensus</span>}
                </div>
                <div style={{ borderRadius: 'var(--r-md)', border: '1px solid var(--border-mute)', background: 'var(--surface-1)', padding: 'var(--s4)', position: 'relative', overflow: 'hidden' }}>
                  <span className="label" style={{ fontSize: 9 }}>thesis</span>
                  <p style={{ fontSize: 14, color: 'var(--text-hi)', margin: '6px 0 0', lineHeight: 1.5 }}>{thesis}{decomposing && <span className="caret" />}</p>
                </div>
                {decomposing && (
                  <div className="col gap2" style={{ marginTop: 'var(--s5)' }}>
                    {['Tokenizing thesis…','Identifying data sources…','Mapping comparators & thresholds…'].map((t,i) => (
                      <div key={t} className="row gap2" style={{ animation: `fadeUp 0.4s var(--ease-out) ${i*700}ms both` }}>
                        <span className="spinner" style={{ width: 12, height: 12 }} /><span className="mono" style={{ fontSize: 12, color: 'var(--text-mid)' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!decomposing && (
                  <div className="col gap3" style={{ marginTop: 'var(--s5)' }}>
                    <div className="row between"><span className="label">Logic</span><span className="badge is-live" style={{ height: 20 }}>conjunctive · AND</span></div>
                    {parsed.map((p, i) => (
                      <div key={p.id} className="panel" style={{ padding: 'var(--s4)', animation: `fadeUp 0.4s var(--ease-out) ${i*120}ms both` }}>
                        <div className="row between">
                          <span className="row gap2"><UI.AgentChip agent={p.agent} size={16} /><span className="h4" style={{ fontSize: 13.5 }}>{p.label}</span></span>
                          <span className="badge" style={{ height: 20 }}>{p.sourceType.replace('_',' ')}</span>
                        </div>
                        <div className="kv" style={{ marginTop: 'var(--s3)', gridTemplateColumns: '90px 1fr' }}>
                          <dt>Source</dt><dd className="mono" style={{ fontSize: 12 }}>{p.source}</dd>
                          <dt>Selector</dt><dd className="mono" style={{ fontSize: 12, color: 'var(--text-mid)' }}>{p.selector}</dd>
                          <dt>Condition</dt><dd className="mono" style={{ fontSize: 12 }}>value {UI.CMP[p.comparator]} {p.unit==='$'?'$':''}{L().fmtNum(p.threshold, p.decimals)}</dd>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <NavRow back={() => setStep(0)} nextLabel="Confirm signals" next={() => !decomposing && setStep(2)} disabled={decomposing} />
            </div>
          )}

          {/* STEP 2 — CONFIRM */}
          {step === 2 && (
            <div className="fade-up">
              <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>Confirm signals</h2>
              <p className="muted" style={{ marginBottom: 'var(--s6)', fontSize: 14.5 }}>Review what the agent will monitor. Adjust thresholds or remove a signal before arming.</p>
              <div className="col gap4">
                {parsed.map(p => (
                  <div key={p.id} className="panel" style={{ padding: 'var(--s5)' }}>
                    <div className="row between" style={{ marginBottom: 'var(--s4)' }}>
                      <span className="row gap2"><UI.AgentChip agent={p.agent} size={18} showName /><span className="h4" style={{ fontSize: 14 }}>{p.label}</span></span>
                      <button className="btn-icon" style={{ width: 26, height: 26 }}><I.X size={13} /></button>
                    </div>
                    <div className="row gap4 wrap">
                      <div className="col" style={{ gap: 6 }}><span className="field-label">Source</span><span className="tok-pill" style={{ height: 34 }}>{p.source}</span></div>
                      <div className="col" style={{ gap: 6 }}><span className="field-label">Comparator</span><span className="tok-pill" style={{ height: 34 }}>{UI.CMP[p.comparator]} {p.comparator}</span></div>
                      <div className="col grow" style={{ gap: 6, minWidth: 120 }}><span className="field-label">Threshold</span><input className="input" defaultValue={p.unit==='$'?'$'+L().fmtNum(p.threshold,2):L().fmtNum(p.threshold,p.decimals)} /></div>
                    </div>
                  </div>
                ))}
              </div>
              <NavRow back={() => setStep(1)} nextLabel="Set budget" next={() => setStep(3)} />
            </div>
          )}

          {/* STEP 3 — BUDGET */}
          {step === 3 && (
            <div className="fade-up">
              <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>Budget & execution</h2>
              <p className="muted" style={{ marginBottom: 'var(--s6)', fontSize: 14.5 }}>Fund the agent calls and configure the swap. Unused budget is returned.</p>
              <div className="row gap5 wrap" style={{ alignItems: 'flex-start' }}>
                <div className="panel grow" style={{ padding: 'var(--s6)', minWidth: 300 }}>
                  <div className="col gap5">
                    <div><span className="field-label">Trade size</span>
                      <div className="row gap3"><input className="input mono" value={amount} onChange={e=>setAmount(+e.target.value||0)} style={{ maxWidth: 140 }} /><span className="tok-pill" style={{ height: 38 }}>{tokIn}</span><I.Arrow size={14} style={{ color: 'var(--text-faint)', alignSelf: 'center' }} /><span className="tok-pill" style={{ height: 38 }}>{tokOut}</span></div>
                    </div>
                    <div><span className="field-label">Agent budget (STT)</span>
                      <input className="input mono" value={budget} onChange={e=>setBudget(+e.target.value||0)} style={{ maxWidth: 140 }} />
                      <input type="range" min="0.6" max="3" step="0.1" value={budget} onChange={e=>setBudget(+e.target.value)} style={{ width: '100%', marginTop: 12, accentColor: 'var(--accent)' }} />
                    </div>
                    <div><span className="field-label">Max slippage</span>
                      <div className="seg"><button data-on>0.5%</button><button>1%</button><button>2%</button></div>
                    </div>
                  </div>
                </div>
                <div className="panel" style={{ padding: 'var(--s6)', flex: '1 1 280px' }}>
                  <span className="label">Estimated agent spend</span>
                  <div className="col gap3" style={{ marginTop: 'var(--s4)' }}>
                    <CostRow label="Decompose · LLM" v={depositPerLLM} />
                    <CostRow label={`Monitor · ${signalCount} signals`} v={depositPerSignal*signalCount} />
                    <CostRow label="Execute · inferToolsChat" v={depositPerLLM} />
                    <div className="divider" />
                    <div className="row between"><span className="sm" style={{ color: 'var(--text-hi)' }}>Reserved from budget</span><span className="mono" style={{ color: 'var(--text-hi)' }}>{estSpend} STT</span></div>
                    <div className="row between"><span className="sm muted">Headroom</span><span className="mono" style={{ color: 'var(--up)' }}>{(budget-estSpend).toFixed(2)} STT</span></div>
                  </div>
                </div>
              </div>
              <NavRow back={() => setStep(2)} nextLabel="Review & arm" next={() => setStep(4)} />
            </div>
          )}

          {/* STEP 4 — ARM */}
          {step === 4 && (
            <div className="fade-up">
              <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>Arm mandate</h2>
              <p className="muted" style={{ marginBottom: 'var(--s6)', fontSize: 14.5 }}>One transaction escrows your budget and dispatches the Decomposer. Monitoring begins immediately.</p>
              <div className="panel" style={{ padding: 'var(--s6)', marginBottom: 'var(--s5)' }}>
                <p style={{ fontSize: 16, color: 'var(--text-hi)', lineHeight: 1.5, marginBottom: 'var(--s5)', letterSpacing: '-0.01em' }}>{thesis}</p>
                <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                  <SumCell label="Trade" value={<UI.TokenPair inT={tokIn} outT={tokOut} />} />
                  <SumCell label="Amount" value={<span className="mono">{amount} {tokIn}</span>} />
                  <SumCell label="Signals" value={<span className="mono">{signalCount}</span>} />
                  <SumCell label="Budget" value={<span className="mono">{budget} STT</span>} />
                </div>
              </div>
              <div className="row between wrap gap4">
                <button className="btn btn-secondary" onClick={() => setStep(3)}><I.Arrow size={14} style={{ transform: 'rotate(180deg)' }} />Back</button>
                <button className="btn btn-primary btn-lg" onClick={arm}><I.Bolt size={16} />Arm mandate · {estSpend} STT</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function NavRow({ back, next, nextLabel, disabled }) {
  return (
    <div className="row between" style={{ marginTop: 'var(--s7)' }}>
      <button className="btn btn-secondary" onClick={back}><I.Arrow size={14} style={{ transform: 'rotate(180deg)' }} />Back</button>
      <button className="btn btn-primary" onClick={next} aria-disabled={disabled}>{nextLabel} <I.Arrow size={14} /></button>
    </div>
  );
}
function CostRow({ label, v }) {
  return <div className="row between"><span className="sm muted">{label}</span><span className="mono faint" style={{ fontSize: 12 }}>{v.toFixed(2)} STT</span></div>;
}
function SumCell({ label, value }) {
  return <div style={{ padding: 'var(--s4) var(--s5)' }}><div className="label" style={{ fontSize: 9.5, marginBottom: 6 }}>{label}</div><div style={{ fontSize: 14, color: 'var(--text-hi)' }}>{value}</div></div>;
}

window.ROUTES = window.ROUTES || {};
window.ROUTES.CreateMandate = CreateMandate;
