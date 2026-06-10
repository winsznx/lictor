/* ============================================================
   LICTOR — Signals monitor + Consensus view
   ============================================================ */

/* ---------- SIGNALS ---------- */
function Signals({ onCmd }) {
  UI.useLive();
  const all = [];
  L().MANDATES.forEach(m => m.signals.forEach(s => all.push({ ...s, mandate: m.code, mid: m.id })));
  const [view, setView] = useState('grid');
  const met = all.filter(s => s.triggered).length;
  return (
    <>
      <SHELL.Topbar title="Signals" sub={`${all.length} monitored · ${met} met`} onCmd={onCmd}
        actions={<button className="btn btn-secondary btn-sm"><I.Refresh size={13} />Tick all</button>} />
      <div className="page">
        <div className="page-pad-wide" style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 'var(--s7)' }}>
            <Kpi label="Signals live" value={all.filter(s=>s.health!=='stale').length} />
            <Kpi label="Conditions met" value={met} tone="up" />
            <Kpi label="Sources" value="5" sub="3 JSON · 2 parse" />
            <Kpi label="Refresh interval" value="60s" />
          </div>

          <div className="sec-head">
            <div className="sec-title"><h2 className="h3">Live monitors</h2><span className="pulse-dot" /></div>
            <div className="seg">
              <button data-on={view==='grid'} onClick={()=>setView('grid')}>Grid</button>
              <button data-on={view==='table'} onClick={()=>setView('table')}>Table</button>
            </div>
          </div>

          {view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--s5)' }}>
              {all.map((s,i) => (
                <a key={i} href={'#/mandate/'+s.mid} style={{ display: 'block' }}>
                  <BLOCKS.SignalCard s={s} />
                </a>
              ))}
            </div>
          ) : (
            <div className="panel" style={{ overflow: 'hidden' }}>
              <table className="tbl">
                <thead><tr><th>Signal</th><th>Agent</th><th>Source</th><th>Current</th><th>Threshold</th><th>Distance</th><th>Health</th><th>Updated</th></tr></thead>
                <tbody>
                  {all.map((s,i) => {
                    const d = UI.distance(s);
                    return (
                      <tr key={i} className="lrow" onClick={()=>location.hash='#/mandate/'+s.mid}>
                        <td><span className="row gap2">{s.triggered?<I.CheckCircle size={13} style={{color:'var(--up)'}}/>:<span style={{width:8,height:8,borderRadius:'50%',border:'1.5px solid var(--text-faint)'}}/>}<span style={{color:'var(--text-hi)'}}>{s.label}</span></span></td>
                        <td><UI.AgentChip agent={s.agent} size={15} showName /></td>
                        <td><span className="mono faint" style={{fontSize:11.5}}>{s.source}</span></td>
                        <td><span className="mono" style={{color:s.triggered?'var(--up)':'var(--text-hi)'}}>{UI.fmtSig(s)}</span></td>
                        <td><span className="mono faint">{UI.CMP[s.comparator]} {UI.fmtThresh(s)}</span></td>
                        <td><div className="meter" style={{width:70}}><span style={{width:(s.triggered?100:Math.round(d*100))+'%',background:s.triggered?'var(--up)':'var(--accent)'}}/></div></td>
                        <td>{s.health==='stale'?<span className="rcp-result" style={{color:'var(--down)'}}>stale</span>:<span className="rcp-result" style={{color:'var(--up)'}}><span className="pulse-dot up" style={{width:5,height:5}}/>live</span>}</td>
                        <td><span className="mono faint" style={{fontSize:11}}>{L().fmtAgo(s.lastUpdated)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- CONSENSUS ---------- */
function Consensus({ onCmd }) {
  UI.useLive();
  const [active, setActive] = useState(0);
  const rounds = [
    { id: 'rcp_8841', phase: 'Execute', agent: 'executor', mandate: 'LCT-0042', value: 0.96, validators: 3, decision: 'executeSwap(USDC→SOMI, 500)' },
    { id: 'rcp_8821', phase: 'Decompose', agent: 'decomposer', mandate: 'LCT-0042', value: 0.94, validators: 3, decision: '2 signals · conjunctive' },
    { id: 'rcp_8902', phase: 'Signal · Parse', agent: 'parse', mandate: 'LCT-0041', value: 0.88, validators: 3, decision: 'recession odds = 0.63' },
  ];
  const r = rounds[active];
  return (
    <>
      <SHELL.Topbar title="Consensus" sub="Validator agreement on agent decisions" onCmd={onCmd} />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 1100 }}>
          <div className="row gap6 wrap" style={{ alignItems: 'flex-start' }}>
            {/* explainer + viz */}
            <div style={{ flex: '1 1 460px', minWidth: 0 }}>
              <div className="panel" style={{ padding: 'var(--s7)', marginBottom: 'var(--s5)' }}>
                <div className="row between" style={{ marginBottom: 'var(--s6)' }}>
                  <div className="col" style={{ gap: 3 }}>
                    <span className="row gap2"><UI.AgentChip agent={r.agent} size={18} showName /><span className="mono faint" style={{ fontSize: 11 }}>· {r.phase}</span></span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-mid)' }}>{r.id} · {r.mandate}</span>
                  </div>
                  <span className="badge is-armed"><I.Check size={10} />finalized</span>
                </div>
                <UI.ConsensusViz value={r.value} validators={5} />
                <div className="divider" style={{ margin: 'var(--s6) 0' }} />
                <div className="row between">
                  <span className="label">Converged decision</span>
                </div>
                <div className="code" style={{ marginTop: 'var(--s3)' }}>{r.decision}</div>
              </div>

              <div className="panel" style={{ padding: 'var(--s6)' }}>
                <span className="label">Why this is trustworthy</span>
                <div className="col gap4" style={{ marginTop: 'var(--s4)' }}>
                  {[
                    ['Deterministic inference', 'The model runs at temperature 0 with fixed seeds, so every validator computes the identical output.'],
                    ['Independent validators', 'A subcommittee of validators in different regions each run the call and submit their result.'],
                    ['Byte-level agreement', 'Finalization requires the responses to match exactly. Divergence is rejected, not averaged.'],
                  ].map(([t,d],i) => (
                    <div key={i} className="row gap3" style={{ alignItems: 'flex-start' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 'var(--r-xs)', background: 'var(--accent-softer)', border: '1px solid var(--accent-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: 'var(--accent-hi)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i+1}</span>
                      <div className="col" style={{ gap: 2 }}><span className="h4" style={{ fontSize: 13.5 }}>{t}</span><span className="muted sm" style={{ lineHeight: 1.5 }}>{d}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* rounds list + responses */}
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <div className="sec-head"><div className="sec-title"><h2 className="h3">Recent rounds</h2></div></div>
              <div className="panel" style={{ marginBottom: 'var(--s5)' }}>
                {rounds.map((rd,i) => (
                  <div key={rd.id} className="feed-row lrow" style={{ gridTemplateColumns: '30px 1fr auto', background: i===active?'var(--surface-1)':'transparent' }} onClick={()=>setActive(i)}>
                    <UI.AgentChip agent={rd.agent} size={28} />
                    <div className="col" style={{ gap: 1 }}><span style={{ fontSize: 13, color: 'var(--text-hi)' }}>{rd.phase}</span><span className="mono faint" style={{ fontSize: 10.5 }}>{rd.id}</span></div>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--up)' }}>{(rd.value*100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div className="sec-head"><div className="sec-title"><h2 className="h3">Validator responses</h2></div></div>
              <div className="panel">
                {L().VALIDATORS.map((v,i) => {
                  const agree = i < Math.round(r.value*5);
                  return (
                    <div key={v.id} className="row between" style={{ padding: 'var(--s3) var(--s4)', borderBottom: i<4?'1px solid var(--border-faint)':'none' }}>
                      <span className="row gap3">
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: agree?'var(--up-soft)':'var(--surface-2)', border: `1px solid ${agree?'var(--up-line)':'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{agree?<I.Check size={10} style={{color:'var(--up)'}}/>:<span style={{width:4,height:4,borderRadius:'50%',background:'var(--text-faint)'}}/>}</span>
                        <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-hi)' }}>{v.label}</span>
                        <span className="badge" style={{ height: 17, fontSize: 9 }}>{v.region}</span>
                      </span>
                      <span className="mono faint" style={{ fontSize: 11 }}>{agree?'matched':'—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const Kpi = window.ROUTES._Kpi;
window.ROUTES = window.ROUTES || {};
window.ROUTES.Signals = Signals;
window.ROUTES.Consensus = Consensus;
