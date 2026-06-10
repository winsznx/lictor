/* ============================================================
   LICTOR — Receipts Explorer + Public Feed
   ============================================================ */

/* ---------- RECEIPTS ---------- */
function Receipts({ onCmd }) {
  UI.useLive();
  const [q, setQ] = useState('');
  const [agentF, setAgentF] = useState('all');
  const [resultF, setResultF] = useState('all');
  const [sel, setSel] = useState(null);
  const list = L().RECEIPTS.filter(r =>
    (agentF === 'all' || r.agent === agentF) &&
    (resultF === 'all' || r.result === resultF) &&
    (q === '' || (r.id + r.mandate).toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <>
      <SHELL.Topbar title="Receipts" sub={`${L().RECEIPTS.length} agent calls · consensus-finalized`} onCmd={onCmd}
        actions={<button className="btn btn-secondary btn-sm"><I.External size={13} />agents.testnet</button>} />
      <div className="page">
        <div className="page-pad-wide" style={{ maxWidth: 1320, margin: '0 auto' }}>
          {/* filter bar */}
          <div className="row gap3 wrap" style={{ marginBottom: 'var(--s5)' }}>
            <div className="row gap2" style={{ flex: '1 1 260px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0 var(--s3)', height: 36 }}>
              <I.Search size={15} style={{ color: 'var(--text-lo)' }} />
              <input className="cmd-input" style={{ fontSize: 13 }} placeholder="Search request ID or mandate…" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
            <div className="seg">
              {['all','decomposer','json','parse','executor'].map(a => <button key={a} data-on={agentF===a} onClick={()=>setAgentF(a)}>{a==='all'?'All agents':L().AGENTS[a]?.name||a}</button>)}
            </div>
            <div className="seg">
              {['all','Success','TimedOut','Failed'].map(rf => <button key={rf} data-on={resultF===rf} onClick={()=>setResultF(rf)}>{rf}</button>)}
            </div>
          </div>

          <div className="panel" style={{ overflow: 'hidden' }}>
            <table className="tbl">
              <thead><tr><th>Request ID</th><th>Agent</th><th>Mandate</th><th>Consensus</th><th>Latency</th><th>Deposit</th><th>Result</th><th>When</th><th></th></tr></thead>
              <tbody>
                {list.slice(0, 24).map(r => (
                  <tr key={r.id} className="lrow" onClick={()=>setSel(r)}>
                    <td><span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>{r.id}</span></td>
                    <td><UI.AgentChip agent={r.agent} size={16} showName /></td>
                    <td><span className="mono faint" style={{ fontSize: 12 }}>{r.mandate}</span></td>
                    <td><span className="row gap2"><span className="mono" style={{ fontSize: 12, color: r.result==='Success'?'var(--up)':'var(--text-mid)' }}>{(r.consensus*100).toFixed(0)}%</span><div className="meter" style={{ width: 40 }}><span style={{ width: (r.consensus*100)+'%', background: r.result==='Success'?'var(--up)':'var(--warn)' }} /></div></span></td>
                    <td><span className="mono faint" style={{ fontSize: 11.5 }}>{r.latency}ms</span></td>
                    <td><span className="mono faint" style={{ fontSize: 11.5 }}>{r.deposit.toFixed(2)} STT</span></td>
                    <td><ResultPill result={r.result} /></td>
                    <td><span className="mono faint" style={{ fontSize: 11 }}>{L().fmtAgo(r.at)}</span></td>
                    <td><I.Chevron size={14} style={{ color: 'var(--text-faint)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row center" style={{ marginTop: 'var(--s5)' }}>
            <span className="mono faint" style={{ fontSize: 11.5 }}>Showing {Math.min(24, list.length)} of {list.length}</span>
          </div>
        </div>
      </div>
      {sel && <ROUTES._ReceiptDrawer r={{ id: sel.id, phase: sel.agent==='executor'?'EXECUTING':sel.agent==='decomposer'?'DECOMPOSED':'MONITORING', agent: sel.agent, consensus: sel.consensus, at: sel.at, tx: '0x77de…02c4' }} onClose={()=>setSel(null)} />}
    </>
  );
}
function ResultPill({ result }) {
  const map = { Success: ['var(--up)', I.Check], Failed: ['var(--down)', I.X], TimedOut: ['var(--warn)', I.Clock] };
  const [col, Ic] = map[result] || map.Success;
  return <span className="rcp-result" style={{ color: col }}><Ic size={12} />{result}</span>;
}

/* ---------- PUBLIC FEED ---------- */
function PublicFeed({ onCmd }) {
  UI.useLive();
  const [items, setItems] = useState(() => [...L().FEED]);
  // simulate new items arriving
  useEffect(() => {
    const samples = [
      { actor: 'val.aurelius', action: 'executed', mandate: 'LCT-0046', detail: 'Bought 12,400 SOMI', kind: 'exec', amt: '+$340' },
      { actor: 'anon.4b2c', action: 'submitted', mandate: 'LCT-0047', detail: 'Long BTC if ETF inflows > $200M', kind: 'submit' },
      { actor: 'val.cicero', action: 'triggered', mandate: 'LCT-0037', detail: 'Total mcap held above $2.4T', kind: 'trigger' },
      { actor: 'anon.8f01', action: 'armed', mandate: 'LCT-0048', detail: '3 signals monitoring', kind: 'arm' },
    ];
    const id = setInterval(() => {
      const s = samples[Math.floor(Math.random()*samples.length)];
      setItems(prev => [{ ...s, id: Math.random().toString(36).slice(2), at: Date.now() }, ...prev].slice(0, 24));
    }, 4000);
    return () => clearInterval(id);
  }, []);
  const FeedRow = ROUTES._FeedRow;
  return (
    <>
      <SHELL.Topbar title="Public feed" sub="Every mandate across the network" onCmd={onCmd}
        actions={<span className="badge is-live"><span className="pulse-dot" style={{ width: 5, height: 5 }} />live</span>} />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 880 }}>
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 'var(--s7)' }}>
            <Kpi label="Mandates today" value="74" tone="up" />
            <Kpi label="Executed (24h)" value="38" />
            <Kpi label="Volume (24h)" value="$1.2M" />
          </div>
          <div className="sec-head"><div className="sec-title"><h2 className="h3">Activity stream</h2><span className="pulse-dot" /></div></div>
          <div className="panel">
            {items.map((f) => <FeedRow key={f.id} f={f} />)}
          </div>
        </div>
      </div>
    </>
  );
}

const Kpi = window.ROUTES._Kpi;
window.ROUTES = window.ROUTES || {};
window.ROUTES.Receipts = Receipts;
window.ROUTES.PublicFeed = PublicFeed;
