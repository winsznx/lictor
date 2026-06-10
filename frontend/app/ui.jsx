/* ============================================================
   LICTOR — UI primitives & visualizations
   ============================================================ */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const L = () => window.LICTOR;

/* ---- live re-render hook: subscribe to engine ---- */
function useLive() {
  const [, set] = useState(0);
  useEffect(() => L().subscribe(() => set(n => n + 1)), []);
}

/* ---- status meta ---- */
const STATUS_META = {
  PENDING:   { cls: 'is-pending', label: 'Pending' },
  ARMED:     { cls: 'is-armed',   label: 'Armed' },
  TRIGGERED: { cls: 'is-exec',    label: 'Triggered' },
  EXECUTING: { cls: 'is-exec',    label: 'Executing' },
  EXECUTED:  { cls: 'is-armed',   label: 'Executed' },
  FAILED:    { cls: 'is-failed',  label: 'Failed' },
  CLOSED:    { cls: 'is-idle',    label: 'Closed' },
};
function StatusBadge({ status, live }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;
  const showPulse = status === 'EXECUTING' || status === 'TRIGGERED';
  return (
    <span className={`badge ${meta.cls}`}>
      {showPulse ? <span className="pulse-dot" style={{ width: 5, height: 5 }} /> : <span className="dot" />}
      {meta.label}
    </span>
  );
}

/* ---- Sparkline ---- */
function Sparkline({ data, w = 120, h = 32, threshold, comparator, color, fill = true, strokeW = 1.5, glow }) {
  const { path, areaPath, thY, last, min, max } = useMemo(() => {
    if (!data || data.length < 2) return {};
    const min = Math.min(...data), max = Math.max(...data);
    const range = (max - min) || 1;
    const pad = range * 0.12;
    const lo = min - pad, hi = max + pad, rng = hi - lo;
    const X = i => (i / (data.length - 1)) * w;
    const Y = v => h - ((v - lo) / rng) * h;
    let path = `M ${X(0).toFixed(1)} ${Y(data[0]).toFixed(1)}`;
    for (let i = 1; i < data.length; i++) path += ` L ${X(i).toFixed(1)} ${Y(data[i]).toFixed(1)}`;
    const areaPath = path + ` L ${w} ${h} L 0 ${h} Z`;
    const thY = threshold != null ? Y(threshold) : null;
    return { path, areaPath, thY, last: { x: X(data.length - 1), y: Y(data[data.length - 1]) }, min, max };
  }, [data, w, h, threshold]);
  if (!path) return <div style={{ width: w, height: h }} />;
  const c = color || 'var(--accent-hi)';
  const gid = useMemo(() => 'sg' + Math.random().toString(36).slice(2, 8), []);
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.20" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {thY != null && <line x1="0" y1={thY} x2={w} y2={thY} stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="2 3" />}
      {fill && <path d={areaPath} fill={`url(#${gid})`} />}
      <path d={path} fill="none" stroke={c} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"
        style={glow ? { filter: `drop-shadow(0 0 4px ${c})` } : null} />
      {last && <circle cx={last.x} cy={last.y} r="2.2" fill={c} />}
      {last && <circle cx={last.x} cy={last.y} r="2.2" fill={c}><animate attributeName="r" values="2.2;5;2.2" dur="2.2s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;0;1" dur="2.2s" repeatCount="indefinite" /></circle>}
    </svg>
  );
}

/* ---- Area chart (bigger) ---- */
function AreaChart({ data, w = 600, h = 200, color, threshold, label, fmt }) {
  const c = color || 'var(--accent-hi)';
  const gid = useMemo(() => 'ac' + Math.random().toString(36).slice(2, 8), []);
  const { path, area, thY, pts, lo, hi } = useMemo(() => {
    const min = Math.min(...data), max = Math.max(...data);
    const range = (max - min) || 1; const pad = range * 0.15;
    const lo = min - pad, hi = max + pad, rng = hi - lo;
    const X = i => (i / (data.length - 1)) * w;
    const Y = v => h - ((v - lo) / rng) * h;
    let path = `M ${X(0)} ${Y(data[0])}`;
    data.forEach((v, i) => { if (i) path += ` L ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`; });
    return { path, area: path + ` L ${w} ${h} L 0 ${h} Z`, thY: threshold != null ? Y(threshold) : null,
      pts: { x: X(data.length - 1), y: Y(data[data.length - 1]) }, lo, hi };
  }, [data, w, h, threshold]);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="var(--border-faint)" strokeWidth="1" />)}
      {thY != null && <><line x1="0" y1={thY} x2={w} y2={thY} stroke="var(--warn)" strokeWidth="1" strokeDasharray="3 4" opacity="0.8" /></>}
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts.x} cy={pts.y} r="3" fill={c} />
    </svg>
  );
}

/* ---- Bars ---- */
function BarChart({ data, w = 600, h = 160, color }) {
  const c = color || 'var(--accent)';
  const max = Math.max(...data) || 1;
  const bw = w / data.length;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((v, i) => {
        const bh = (v / max) * (h - 8);
        return <rect key={i} x={i * bw + bw * 0.18} y={h - bh} width={bw * 0.64} height={bh} rx="1.5"
          fill={i === data.length - 1 ? 'var(--accent-hi)' : c} opacity={i === data.length - 1 ? 1 : 0.55} />;
      })}
    </svg>
  );
}

/* ---- Donut / ring gauge ---- */
function Ring({ value, size = 64, stroke = 5, color, track, label, sub }) {
  const c = color || 'var(--accent-hi)';
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - value);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track || 'var(--surface-3)'} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.6s var(--ease-out)' }} />
      </svg>
      {label != null && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="mono" style={{ fontSize: size * 0.26, fontWeight: 500, color: 'var(--text-hi)', lineHeight: 1 }}>{label}</span>
          {sub && <span className="label" style={{ fontSize: 8, marginTop: 2 }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

/* ---- Agent glyph chip ---- */
function AgentChip({ agent, size = 22, showName, dim }) {
  const a = L().AGENTS[agent] || { glyph: '?', name: agent, color: 'var(--text-lo)' };
  return (
    <span className="row gap2" style={{ opacity: dim ? 0.6 : 1 }}>
      <span style={{ width: size, height: size, borderRadius: 'var(--r-xs)', flex: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'color-mix(in srgb, ' + a.color + ' 14%, transparent)',
        border: '1px solid color-mix(in srgb, ' + a.color + ' 32%, transparent)',
        color: a.color, fontFamily: 'var(--font-mono)', fontSize: size * 0.42, fontWeight: 500 }}>
        {a.glyph}
      </span>
      {showName && <span className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--text-mid)' }}>{a.name}</span>}
    </span>
  );
}

/* ---- Token pair ---- */
function TokenPair({ inT, outT }) {
  return (
    <span className="row gap2 mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--text-mid)' }}>
      <span style={{ color: 'var(--text)' }}>{inT}</span>
      <I.Arrow size={11} style={{ color: 'var(--text-faint)' }} />
      <span style={{ color: 'var(--text)' }}>{outT}</span>
    </span>
  );
}

/* ============================================================
   CONSENSUS VISUALIZATION — validators converging on a decision
   ============================================================ */
function ConsensusViz({ value = 0.92, validators = 5, size = 'lg', animate = true }) {
  const vlist = L().VALIDATORS.slice(0, validators);
  const agreeing = Math.round(value * validators);
  const big = size === 'lg';
  return (
    <div className="col gap4">
      <div className="row gap3 wrap">
        {vlist.map((v, i) => {
          const agree = i < agreeing;
          return (
            <div key={v.id} className="col gap2" style={{ alignItems: 'center', animation: animate ? `fadeUp 0.5s var(--ease-out) ${i * 90}ms both` : 'none' }}>
              <div style={{ position: 'relative', width: big ? 46 : 34, height: big ? 46 : 34 }}>
                <svg width="100%" height="100%" viewBox="0 0 46 46">
                  <circle cx="23" cy="23" r="20" fill={agree ? 'var(--up-soft)' : 'var(--surface-2)'}
                    stroke={agree ? 'var(--up-line)' : 'var(--border)'} strokeWidth="1.4" />
                  {agree
                    ? <path d="M16 23.5l5 5 9-11" fill="none" stroke="var(--up)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    : <circle cx="23" cy="23" r="3" fill="var(--text-faint)" />}
                  {agree && <circle cx="23" cy="23" r="20" fill="none" stroke="var(--up)" strokeWidth="1.4" opacity="0.5">
                    <animate attributeName="r" values="20;23;20" dur="2.4s" begin={`${i*0.2}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" begin={`${i*0.2}s`} repeatCount="indefinite" />
                  </circle>}
                </svg>
              </div>
              <span className="mono faint" style={{ fontSize: 9.5 }}>{v.label.replace('val.', '')}</span>
            </div>
          );
        })}
      </div>
      <div className="row between" style={{ paddingTop: 'var(--s2)' }}>
        <span className="row gap2">
          <span className="mono" style={{ fontSize: big ? 26 : 18, fontWeight: 500, color: 'var(--up)', letterSpacing: '-0.02em' }}>
            {agreeing}/{validators}
          </span>
          <span className="label" style={{ alignSelf: 'flex-end', marginBottom: 4 }}>agreed</span>
        </span>
        <span className="col" style={{ alignItems: 'flex-end' }}>
          <span className="mono" style={{ fontSize: big ? 18 : 14, color: 'var(--text-hi)' }}>{(value * 100).toFixed(1)}%</span>
          <span className="label" style={{ fontSize: 8.5 }}>confidence</span>
        </span>
      </div>
    </div>
  );
}

/* ---- Copy button ---- */
function CopyBtn({ text, size = 13 }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => {
      e.stopPropagation();
      navigator.clipboard && navigator.clipboard.writeText(text);
      setDone(true); setTimeout(() => setDone(false), 1200);
    }}>
      {done ? <I.Check size={size} style={{ color: 'var(--up)' }} /> : <I.Copy size={size} />}
    </button>
  );
}

/* ---- Comparator symbol ---- */
const CMP = { GT: '>', GTE: '≥', LT: '<', LTE: '≤', EQ: '=' };

/* ---- Signal value formatter ---- */
function fmtSig(s) {
  const v = s.latest;
  if (s.unit === '$') return '$' + L().fmtNum(v, v < 100 ? 2 : 0);
  if (s.decimals === 0 && Math.abs(v) >= 1000) return L().fmtNum(v);
  return L().fmtNum(v, s.decimals) + (s.unit && s.unit !== '$' ? s.unit : '');
}
function fmtThresh(s) {
  if (s.unit === '$') return '$' + L().fmtNum(s.threshold, s.threshold < 100 ? 2 : 0);
  if (s.decimals === 0 && Math.abs(s.threshold) >= 1000) return L().fmtNum(s.threshold);
  return L().fmtNum(s.threshold, s.decimals) + (s.unit && s.unit !== '$' ? s.unit : '');
}
/* distance to trigger as fraction 0..1 (how close) */
function distance(s) {
  const span = Math.abs(s.threshold) * 0.06 || 1;
  const d = Math.abs(s.latest - s.threshold);
  return Math.max(0, Math.min(1, 1 - d / span));
}

window.UI = {
  useLive, StatusBadge, STATUS_META, Sparkline, AreaChart, BarChart, Ring,
  AgentChip, TokenPair, ConsensusViz, CopyBtn, CMP, fmtSig, fmtThresh, distance,
};
Object.assign(window, { useState, useEffect, useRef, useMemo, useCallback, L });
