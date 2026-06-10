/* ============================================================
   LICTOR — Analytics + Settings + Docs
   ============================================================ */

/* ---------- ANALYTICS ---------- */
function Analytics({ onCmd }) {
  UI.useLive();
  const A = L().ANALYTICS;
  const [range, setRange] = useState('30d');
  return (
    <>
      <SHELL.Topbar title="Analytics" sub="Network performance" onCmd={onCmd}
        actions={<div className="seg">{['7d','30d','90d'].map(r=><button key={r} data-on={range===r} onClick={()=>setRange(r)}>{r}</button>)}</div>} />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 1180 }}>
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 'var(--s5)' }}>
            <StatBig label="Mandates created" value={A.mandatesCreated.toLocaleString()} delta="+12.4%" up />
            <StatBig label="Execution rate" value={(A.executionRate*100).toFixed(1)+'%'} delta="+2.1%" up />
            <StatBig label="Avg consensus" value={(A.avgConsensusMs/1000).toFixed(2)+'s'} delta="-180ms" up />
            <StatBig label="Agent calls" value={A.agentCalls.toLocaleString()} delta="+1,204" up />
            <StatBig label="Volume routed" value={'$'+(A.volumeRouted/1e6).toFixed(2)+'M'} delta="+8.7%" up />
            <StatBig label="Success rate" value={(A.successRate*100).toFixed(1)+'%'} delta="+0.4%" up />
          </div>

          <div className="row gap5 wrap" style={{ marginBottom: 'var(--s5)' }}>
            <div className="panel grow" style={{ minWidth: 340 }}>
              <div className="panel-hd"><span className="h4" style={{ fontSize: 14 }}>Volume routed</span><span className="mono faint" style={{ fontSize: 11 }}>STT · daily</span></div>
              <div className="chart-card"><UI.AreaChart data={A.volSeries} h={180} color="var(--accent-hi)" /></div>
            </div>
            <div className="panel grow" style={{ minWidth: 340 }}>
              <div className="panel-hd"><span className="h4" style={{ fontSize: 14 }}>Consensus latency</span><span className="mono faint" style={{ fontSize: 11 }}>ms · daily</span></div>
              <div className="chart-card"><UI.AreaChart data={A.consensusSeries} h={180} color="var(--up)" /></div>
            </div>
          </div>

          <div className="row gap5 wrap">
            <div className="panel grow" style={{ minWidth: 340 }}>
              <div className="panel-hd"><span className="h4" style={{ fontSize: 14 }}>Mandates created</span><span className="mono faint" style={{ fontSize: 11 }}>daily</span></div>
              <div className="chart-card"><UI.BarChart data={A.volSeries} h={150} /></div>
            </div>
            <div className="panel" style={{ flex: '1 1 300px' }}>
              <div className="panel-hd"><span className="h4" style={{ fontSize: 14 }}>Agent call mix</span></div>
              <div className="chart-card col gap4">
                {[['Decomposer','decomposer',0.21,'var(--accent-hi)'],['JSON API','json',0.44,'var(--up)'],['Parse Web','parse',0.18,'var(--warn)'],['Executor','executor',0.17,'var(--accent)']].map(([n,a,v,c]) => (
                  <div key={n} className="col gap2">
                    <div className="row between"><span className="row gap2"><UI.AgentChip agent={a} size={16} /><span className="sm">{n}</span></span><span className="mono" style={{ fontSize: 12 }}>{(v*100).toFixed(0)}%</span></div>
                    <div className="meter"><span style={{ width: (v*100)+'%', background: c }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function StatBig({ label, value, delta, up }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-delta ${up?'up':'down'}`}>{up?<I.ArrowUp size={11}/>:<I.ArrowDown size={11}/>}{delta} <span className="faint" style={{ marginLeft: 2 }}>vs prev</span></div>
    </div>
  );
}

/* ---------- SETTINGS ---------- */
const SET_SECTIONS = ['Wallets','Notifications','Agent preferences','Execution defaults','API keys','Appearance'];
function Settings({ onCmd }) {
  const [sec, setSec] = useState('Wallets');
  const push = SHELL.useToast();
  return (
    <>
      <SHELL.Topbar title="Settings" onCmd={onCmd} />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 980 }}>
          <div className="settings-grid">
            <nav className="set-nav">
              {SET_SECTIONS.map(s => <a key={s} data-on={sec===s} onClick={()=>setSec(s)}>{s}</a>)}
            </nav>
            <div>
              {sec === 'Wallets' && (
                <Section title="Wallets" desc="Connected accounts that can submit and fund mandates.">
                  <div className="panel">
                    {[['0x7a4f…2e9c','Primary · MetaMask','18.4 STT',true],['0x3c91…8b2a','Hardware · Ledger','4.1 STT',false]].map(([a,l,b,p],i) => (
                      <div key={a} className="set-row" style={{ padding: 'var(--s4) var(--s5)' }}>
                        <div className="row gap3"><div className="feed-ico" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}><I.Wallet size={14} style={{ color: 'var(--text-mid)' }} /></div><div className="col" style={{ gap: 1 }}><span className="mono" style={{ fontSize: 13, color: 'var(--text-hi)' }}>{a}</span><span className="mono faint" style={{ fontSize: 11 }}>{l}</span></div></div>
                        <div className="row gap3"><span className="mono" style={{ fontSize: 12, color: 'var(--text-mid)' }}>{b}</span>{p&&<span className="badge is-live" style={{ height: 20 }}>active</span>}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--s4)' }}><I.Plus size={13} />Connect wallet</button>
                </Section>
              )}
              {sec === 'Notifications' && (
                <Section title="Notifications" desc="Where Lictor reaches you when mandates change state.">
                  {[['Mandate triggered','Push + email',true],['Execution settled','Push + email',true],['Consensus below 80%','Email only',true],['Signal went stale','Push only',false],['Weekly digest','Email',false]].map(([t,d,on]) => <ToggleRow key={t} title={t} desc={d} on={on} />)}
                </Section>
              )}
              {sec === 'Agent preferences' && (
                <Section title="Agent preferences" desc="Defaults applied when decomposing new theses.">
                  {[['Require my confirmation before arming','Always show decomposition preview',true],['Prefer JSON API over Parse Website','When both sources are available',true],['Auto-tick armed mandates','Poll signals every 60s',true],['Block low-liquidity DEX routes','Skip pools under $50K TVL',true]].map(([t,d,on]) => <ToggleRow key={t} title={t} desc={d} on={on} />)}
                </Section>
              )}
              {sec === 'Execution defaults' && (
                <Section title="Execution defaults" desc="Applied to every new mandate unless overridden.">
                  <div className="set-row"><div className="col" style={{ gap: 2 }}><span className="h4" style={{ fontSize: 14 }}>Max slippage</span><span className="muted sm">Bounds the minOut the contract enforces</span></div><div className="seg"><button>0.5%</button><button data-on>1%</button><button>2%</button></div></div>
                  <div className="set-row"><div className="col" style={{ gap: 2 }}><span className="h4" style={{ fontSize: 14 }}>Default budget</span><span className="muted sm">Reserved for agent calls per mandate</span></div><input className="input mono" defaultValue="1.0 STT" style={{ maxWidth: 120 }} /></div>
                  <div className="set-row"><div className="col" style={{ gap: 2 }}><span className="h4" style={{ fontSize: 14 }}>DEX router</span><span className="muted sm">Settlement venue</span></div><span className="tok-pill" style={{ height: 34 }}>QuickSwap V4 <I.ChevronD size={12} style={{ color: 'var(--text-lo)' }} /></span></div>
                </Section>
              )}
              {sec === 'API keys' && (
                <Section title="API keys" desc="Programmatic access to your desk.">
                  <div className="panel">
                    {[['lct_live_8f2a…','Production','Created 12d ago'],['lct_test_1b9c…','Testnet','Created 3d ago']].map(([k,e,d]) => (
                      <div key={k} className="set-row" style={{ padding: 'var(--s4) var(--s5)' }}>
                        <div className="col" style={{ gap: 2 }}><span className="mono" style={{ fontSize: 13, color: 'var(--text-hi)' }}>{k}</span><span className="mono faint" style={{ fontSize: 11 }}>{e} · {d}</span></div>
                        <div className="row gap2"><UI.CopyBtn text={k} /><button className="btn btn-ghost btn-sm" style={{ color: 'var(--down)' }}>Revoke</button></div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--s4)' }} onClick={()=>push({kind:'success',title:'New key created',body:'Copy it now — it won\'t be shown again'})}><I.Plus size={13} />Create key</button>
                </Section>
              )}
              {sec === 'Appearance' && (
                <Section title="Appearance" desc="Lictor is built for low-light trading environments.">
                  <div className="set-row"><div className="col" style={{ gap: 2 }}><span className="h4" style={{ fontSize: 14 }}>Theme</span><span className="muted sm">Dark is the institutional default</span></div><div className="seg"><button data-on>Dark</button><button>Dim</button><button>System</button></div></div>
                  <ToggleRow title="Reduce motion" desc="Pause live tickers and timeline animations" on={false} />
                  <ToggleRow title="Tabular numerals everywhere" desc="Mono-align all figures" on={true} />
                  <div className="set-row"><div className="col" style={{ gap: 2 }}><span className="h4" style={{ fontSize: 14 }}>Accent</span><span className="muted sm">Reserved for actions & live states</span></div><div className="row gap2">{['#1e63e9','#2f6bff','#3b82f6'].map(c=><span key={c} style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: c, border: c==='#1e63e9'?'2px solid var(--text-hi)':'1px solid var(--border)' }} />)}</div></div>
                </Section>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function Section({ title, desc, children }) {
  return (
    <div className="fade-in">
      <h2 className="h3" style={{ marginBottom: 4 }}>{title}</h2>
      <p className="muted sm" style={{ marginBottom: 'var(--s6)' }}>{desc}</p>
      {children}
    </div>
  );
}
function ToggleRow({ title, desc, on }) {
  const [v, setV] = useState(on);
  return (
    <div className="set-row">
      <div className="col" style={{ gap: 2 }}><span className="h4" style={{ fontSize: 14 }}>{title}</span><span className="muted sm">{desc}</span></div>
      <button className="toggle" data-on={v} onClick={()=>setV(!v)} />
    </div>
  );
}

/* ---------- DOCS ---------- */
const DOC_NAV = [
  ['Start', ['Overview','Quickstart','Concepts']],
  ['Mandates', ['Writing a thesis','Decomposition','Signals','Execution']],
  ['Reference', ['Mandate states','Agent receipts','Contract API']],
];
function Docs({ onCmd }) {
  return (
    <>
      <SHELL.Topbar title="Documentation" onCmd={onCmd}
        actions={<button className="btn btn-secondary btn-sm"><I.External size={13} />GitHub</button>} />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 1100 }}>
          <div className="docs-layout">
            <aside className="docs-side">
              {DOC_NAV.map(([grp, items]) => (
                <React.Fragment key={grp}>
                  <div className="grp">{grp}</div>
                  {items.map((it,i) => <a key={it} data-on={grp==='Start'&&i===0} style={grp==='Start'&&i===0?{background:'var(--surface-2)',color:'var(--text-hi)'}:null}>{it}</a>)}
                </React.Fragment>
              ))}
            </aside>
            <article className="prose">
              <span className="label">Start · Overview</span>
              <h2 style={{ marginTop: 'var(--s3)' }}>What is Lictor?</h2>
              <p>Lictor is an autonomous trading desk on Somnia. You state a trade thesis in plain English; a chain of on-chain agents decomposes it into measurable signals, monitors those signals through validator consensus, and executes the trade when conditions fire. No human intervention after the mandate is armed — and every step produces a receipt.</p>
              <p>In Roman law, the <em>lictor</em> was the attendant who carried out the magistrate's orders. The magistrate issued; the lictor executed. Lictor maps that precisely: you issue a thesis, the agents execute against it.</p>

              <h3>The four stages</h3>
              <p>Every mandate moves through the same pipeline, and you can watch it at every step:</p>
              <div className="panel" style={{ margin: 'var(--s5) 0', overflow: 'hidden' }}>
                {[['Submit','You post the thesis, token pair, and budget in one transaction.','Plus'],['Decompose','The Decomposer parses the thesis into a structured signal array, stored on-chain.','Layers'],['Monitor','JSON and Parse agents fetch live values; threshold checks run at the consensus layer.','Signal'],['Execute','When conditions fire, the Executor yields swap calldata via inferToolsChat and the contract settles.','Bolt']].map(([t,d,ic],i) => {
                  const Ic = I[ic];
                  return (
                    <div key={t} className="row gap4" style={{ padding: 'var(--s4) var(--s5)', borderBottom: i<3?'1px solid var(--border-faint)':'none', alignItems: 'flex-start' }}>
                      <div className="feed-ico" style={{ background: 'var(--accent-softer)', border: '1px solid var(--accent-line)', color: 'var(--accent-hi)' }}><Ic size={15} /></div>
                      <div className="col" style={{ gap: 3 }}><span className="row gap2"><span className="mono faint" style={{ fontSize: 11 }}>{String(i+1).padStart(2,'0')}</span><span className="h4" style={{ fontSize: 14 }}>{t}</span></span><span className="muted sm" style={{ lineHeight: 1.55 }}>{d}</span></div>
                    </div>
                  );
                })}
              </div>

              <h3>Why only on Somnia</h3>
              <p>Other chains that push the agentic narrative still run inference off-chain with attestations — the AI step stays a trusted black box. Somnia validators run the model directly at <code>temperature=0</code> with fixed seeds, so every node reaches consensus on the exact bytes the model produces. Combined with <code>inferToolsChat</code>, which lets the model yield ABI-encoded calldata back to the calling contract, the entire pipeline lives in the consensus layer.</p>

              <h3>Quickstart</h3>
              <p>Open a desk, state your first thesis, and arm it:</p>
              <pre className="code">{`# 1. State a thesis in plain English
"Buy SOMI if Polymarket BTC>100k odds
 drop below 70% and ETH is above $4,000"

# 2. Review the decomposed signals
# 3. Fund the budget · arm the mandate
# 4. Watch it monitor, trigger, and execute`}</pre>
              <div className="row gap3" style={{ marginTop: 'var(--s6)' }}>
                <a href="#/create" className="btn btn-primary"><I.Bolt size={15} />Open a desk</a>
                <a href="#/desk" className="btn btn-secondary">Go to app</a>
              </div>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}

window.ROUTES = window.ROUTES || {};
window.ROUTES.Analytics = Analytics;
window.ROUTES.Settings = Settings;
window.ROUTES.Docs = Docs;
