/* ============================================================
   LICTOR — Shared blocks: SignalCard, MandateRow, SignalBar
   ============================================================ */

/* ---- compact signal progress bar (dense, for rows) ---- */
function SignalBar({ s }) {
  const d = UI.distance(s);
  const col = s.triggered ? 'var(--up)' : d > 0.7 ? 'var(--warn)' : 'var(--accent)';
  return (
    <div className="row gap3" style={{ minWidth: 0 }}>
      <div style={{ width: 16, flex: 'none', display: 'flex', justifyContent: 'center' }}>
        {s.triggered
          ? <I.CheckCircle size={14} style={{ color: 'var(--up)' }} />
          : <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--text-faint)' }} />}
      </div>
      <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)', width: 116, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
      <div className="meter grow" style={{ maxWidth: 120 }}>
        <span style={{ width: (s.triggered ? 100 : Math.round(d * 100)) + '%', background: col }} />
      </div>
      <span className="mono" style={{ fontSize: 11.5, color: s.triggered ? 'var(--up)' : 'var(--text-hi)', whiteSpace: 'nowrap' }}>
        {UI.fmtSig(s)}
      </span>
      <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{UI.CMP[s.comparator]} {UI.fmtThresh(s)}</span>
    </div>
  );
}

/* ---- Full signal card (mission-control) ---- */
function SignalCard({ s, big }) {
  UI.useLive();
  const d = UI.distance(s);
  const col = s.triggered ? 'var(--up)' : d > 0.7 ? 'var(--warn)' : 'var(--accent-hi)';
  const a = L().AGENTS[s.agent];
  return (
    <div className="panel" style={{ padding: 'var(--s5)', position: 'relative', overflow: 'hidden' }}>
      {s.triggered && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--up)', opacity: 0.7 }} />}
      <div className="row between" style={{ marginBottom: 'var(--s4)', gap: 'var(--s3)' }}>
        <div className="col" style={{ gap: 4, minWidth: 0 }}>
          <span className="row gap2" style={{ minWidth: 0 }}>
            <span className="h4" style={{ fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
            {s.triggered
              ? <span className="badge is-armed" style={{ height: 18, flex: 'none' }}><I.Check size={10} />met</span>
              : <span className="badge is-pending" style={{ height: 18, flex: 'none' }}><span className="dot" />watching</span>}
          </span>
          <span className="row gap2" style={{ minWidth: 0 }}>
            <UI.AgentChip agent={s.agent} size={15} />
            <span className="mono faint" style={{ fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.source}</span>
            {s.health === 'stale'
              ? <span className="mono" style={{ fontSize: 10, color: 'var(--down)', flex: 'none' }}>· stale</span>
              : <span className="mono" style={{ fontSize: 10, color: 'var(--up)', flex: 'none' }}>· live</span>}
          </span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 1, flex: 'none' }}>
          <span className="mono" style={{ fontSize: big ? 24 : 20, fontWeight: 500, color: 'var(--text-hi)', letterSpacing: '-0.02em' }}>{UI.fmtSig(s)}</span>
          <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>target {UI.CMP[s.comparator]} {UI.fmtThresh(s)}</span>
        </div>
      </div>
      <div style={{ margin: '0 -4px' }}>
        <UI.Sparkline data={s.history} w={big ? 560 : 300} h={big ? 56 : 44} threshold={s.threshold} color={col} glow={s.triggered} strokeW={1.6} />
      </div>
      <div className="row between" style={{ marginTop: 'var(--s3)' }}>
        <div className="row gap2">
          <span className="label" style={{ fontSize: 9.5 }}>distance to trigger</span>
        </div>
        <div className="row gap3">
          <div className="meter" style={{ width: 90 }}>
            <span style={{ width: (s.triggered ? 100 : Math.round(d * 100)) + '%', background: col }} />
          </div>
          <span className="mono" style={{ fontSize: 11.5, color: col, width: 40, textAlign: 'right' }}>
            {s.triggered ? '0.0%' : (Math.abs((s.latest - s.threshold) / s.threshold) * 100).toFixed(1) + '%'}
          </span>
          <span className="mono faint" style={{ fontSize: 10.5 }}>{L().fmtAgo(s.lastUpdated)}</span>
        </div>
      </div>
    </div>
  );
}

/* ---- Mandate row (dense operational) ---- */
function MandateRow({ m, onOpen }) {
  UI.useLive();
  const trg = m.signals.filter(s => s.triggered).length;
  return (
    <div className="mandate-row lrow" onClick={() => onOpen ? onOpen(m) : (location.hash = '#/mandate/' + m.id)}>
      <div className="mr-id col">
        <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-hi)' }}>{m.code}</span>
        <span className="mono faint" style={{ fontSize: 10.5 }}>{L().fmtAgo(m.createdAt)}</span>
      </div>
      <div className="mr-status"><UI.StatusBadge status={m.status} /></div>
      <div className="mr-thesis col" style={{ gap: 5, minWidth: 0, overflow: 'hidden' }}>
        <span style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.thesis}</span>
        <div className="row gap5" style={{ minWidth: 0, overflow: 'hidden' }}>
          {m.signals.slice(0, 2).map((s, i) => <CompactSig key={s.id} s={s} />)}
          {m.signals.length === 0 && <span className="mono faint" style={{ fontSize: 11 }}>awaiting decomposition…</span>}
        </div>
      </div>
      <div className="mr-meta">
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{trg}/{m.signals.length || '—'} sig</span>
        <span className="mono faint" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>{m.tokenIn} → {m.tokenOut}</span>
      </div>
      <div className="mr-consensus">
        {m.consensus != null
          ? <div className="col" style={{ alignItems: 'flex-end', gap: 3 }}>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-hi)' }}>{(m.consensus * 100).toFixed(0)}%</span>
              <div className="meter up" style={{ width: 56 }}><span style={{ width: (m.consensus * 100) + '%' }} /></div>
            </div>
          : <span className="mono faint" style={{ fontSize: 11 }}>—</span>}
      </div>
      <div className="mr-go">
        {m.status === 'ARMED' && typeof m.nextTick === 'number'
          ? <span className="mono faint" style={{ fontSize: 10.5 }}>tick {m.nextTick}s</span>
          : <span />}
        <I.Chevron size={15} style={{ color: 'var(--text-faint)' }} />
      </div>
    </div>
  );
}

/* ---- compact inline signal (for dense rows) ---- */
function CompactSig({ s }) {
  return (
    <span className="row gap2" style={{ minWidth: 0, flex: 'none' }}>
      {s.triggered
        ? <I.CheckCircle size={12} style={{ color: 'var(--up)', flex: 'none' }} />
        : <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--text-faint)', flex: 'none' }} />}
      <span className="mono" style={{ fontSize: 11, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{s.label}</span>
      <span className="mono" style={{ fontSize: 11, color: s.triggered ? 'var(--up)' : 'var(--text-hi)', whiteSpace: 'nowrap' }}>{UI.fmtSig(s)}</span>
      <span className="mono faint" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>{UI.CMP[s.comparator]} {UI.fmtThresh(s)}</span>
    </span>
  );
}

window.BLOCKS = { SignalBar, SignalCard, MandateRow, CompactSig };
