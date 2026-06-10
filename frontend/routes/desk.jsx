/* ============================================================
   LICTOR — Desk (dashboard / operating center)
   ============================================================ */
function Desk({ onCmd }) {
  UI.useLive();
  const push = SHELL.useToast();
  const [draft, setDraft] = useState('');
  const [tokIn, setTokIn] = useState('USDC');
  const [tokOut, setTokOut] = useState('SOMI');
  const [filter, setFilter] = useState('all');
  const mine = L().MANDATES.filter(m => m.ownerName === 'you');
  const active = mine.filter(m => ['ARMED','EXECUTING','TRIGGERED','PENDING'].includes(m.status));
  const filtered = filter === 'all' ? mine : mine.filter(m => filter === 'active' ? ['ARMED','EXECUTING','TRIGGERED','PENDING'].includes(m.status) : m.status === 'EXECUTED' || m.status === 'FAILED');

  const submit = () => {
    if (!draft.trim()) { push({ kind: 'error', title: 'Enter a thesis first' }); return; }
    sessionStorage.setItem('lictor_draft', draft);
    location.hash = '#/create';
  };

  return (
    <>
      <SHELL.Topbar title="Desk" sub="Operating center · 2 active mandates" onCmd={onCmd}
        actions={<a href="#/create" className="btn btn-primary btn-sm"><I.Plus size={14} />New mandate</a>} />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 1180 }}>
          {/* COMPOSER */}
          <div style={{ marginBottom: 'var(--s8)' }}>
            <div className="row gap2" style={{ marginBottom: 'var(--s4)' }}>
              <I.Bolt size={15} style={{ color: 'var(--accent-hi)' }} />
              <span className="label" style={{ color: 'var(--text-mid)' }}>State a new mandate</span>
            </div>
            <div className="composer">
              <textarea className="composer-input" rows={2} value={draft} onChange={e => setDraft(e.target.value)}
                placeholder="Buy SOMI if Polymarket “BTC > $100k” odds drop below 70% and ETH is above $4,000…"
                onKeyDown={e => { if ((e.metaKey||e.ctrlKey) && e.key === 'Enter') submit(); }} />
              <div className="composer-bar">
                <button className="tok-pill"><span className="lbl">IN</span>{tokIn}<I.ChevronD size={12} style={{ color: 'var(--text-lo)' }} /></button>
                <I.Arrow size={14} style={{ color: 'var(--text-faint)' }} />
                <button className="tok-pill"><span className="lbl">OUT</span>{tokOut}<I.ChevronD size={12} style={{ color: 'var(--text-lo)' }} /></button>
                <button className="tok-pill"><span className="lbl">AMT</span>500</button>
                <button className="tok-pill"><span className="lbl">BUDGET</span>1.0 STT</button>
                <div className="grow" />
                <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap' }}><span className="kbd">⌘</span> <span className="kbd">↵</span> to decompose</span>
                <button className="btn btn-primary btn-sm" onClick={submit}>Decompose <I.Arrow size={13} /></button>
              </div>
            </div>
            <div className="row gap3" style={{ marginTop: 'var(--s3)', flexWrap: 'wrap' }}>
              <span className="mono faint" style={{ fontSize: 11 }}>Try:</span>
              {['Short ETH if recession odds break 60% and ETH < $2,500','Buy WETH if BTC dominance falls under 52%'].map(s => (
                <button key={s} className="chip" onClick={() => setDraft(s)}>{s}</button>
              ))}
            </div>
          </div>

          {/* quick stats */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 'var(--s8)' }}>
            <Kpi label="Active mandates" value="2" />
            <Kpi label="Signals monitored" value="4" sub="2 met" />
            <Kpi label="Avg consensus" value="90%" tone="up" />
            <Kpi label="Budget escrowed" value="2.2 STT" />
          </div>

          {/* ACTIVE MANDATES */}
          <div className="sec-head">
            <div className="sec-title">
              <h2 className="h3">Mandates</h2>
              <span className="badge">{mine.length}</span>
            </div>
            <div className="seg">
              {['all','active','closed'].map(f => <button key={f} data-on={filter===f} onClick={() => setFilter(f)}>{f[0].toUpperCase()+f.slice(1)}</button>)}
            </div>
          </div>
          <div className="panel mandate-list">
            {filtered.length === 0
              ? <div className="empty"><div className="empty-ico"><I.Layers size={22} /></div><span className="muted">No mandates here yet</span></div>
              : filtered.map(m => <BLOCKS.MandateRow key={m.id} m={m} />)}
          </div>

          {/* live activity strip */}
          <div className="sec-head" style={{ marginTop: 'var(--s8)' }}>
            <div className="sec-title"><h2 className="h3">Live activity</h2><span className="pulse-dot" /></div>
            <a href="#/feed" className="btn btn-ghost btn-sm">All activity <I.Arrow size={13} /></a>
          </div>
          <div className="panel">
            {L().FEED.slice(0, 5).map(f => <FeedRow key={f.id} f={f} />)}
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone === 'up' ? { color: 'var(--up)' } : null}>{value}</div>
      {sub && <div className="mono faint" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const FEED_ICON = {
  exec: ['Check', 'var(--up)', 'var(--up-soft)', 'var(--up-line)'],
  arm: ['Shield', 'var(--accent-hi)', 'var(--accent-softer)', 'var(--accent-line)'],
  trigger: ['Bolt', 'var(--accent-hi)', 'var(--accent-softer)', 'var(--accent-line)'],
  submit: ['Plus', 'var(--text-mid)', 'var(--surface-2)', 'var(--border)'],
  fail: ['X', 'var(--down)', 'var(--down-soft)', 'var(--down-line)'],
  decompose: ['Layers', 'var(--warn)', 'var(--warn-soft)', 'var(--warn-line)'],
};
function FeedRow({ f }) {
  const [ic, col, bg, bd] = FEED_ICON[f.kind] || FEED_ICON.submit;
  const Ic = I[ic];
  return (
    <div className="feed-row lrow" onClick={() => location.hash = '#/mandate/' + (f.mandate.replace('LCT-','') || '0042')}>
      <div className="feed-ico" style={{ background: bg, border: `1px solid ${bd}`, color: col }}><Ic size={14} /></div>
      <div className="col" style={{ gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span className="mono" style={{ color: 'var(--text-hi)' }}>{f.actor}</span> {f.action} <span className="mono" style={{ color: 'var(--text-mid)' }}>{f.mandate}</span>
        </span>
        <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.detail}</span>
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
        {f.amt && <span className="mono" style={{ fontSize: 12, color: 'var(--up)' }}>{f.amt}</span>}
        <span className="mono faint" style={{ fontSize: 10.5 }}>{L().fmtAgo(f.at)}</span>
      </div>
    </div>
  );
}

window.ROUTES = window.ROUTES || {};
window.ROUTES.Desk = Desk;
window.ROUTES._FeedRow = FeedRow;
window.ROUTES._Kpi = Kpi;
