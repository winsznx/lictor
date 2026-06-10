/* ============================================================
   LICTOR — Landing v2 acts (the cinematic narrative)
   01 Signal · 02 Debate · 03 Consensus · 04 Capital · 05 Execution · 06 Receipts
   ============================================================ */

/* ---- scroll reveal ---- */
function useInView(opts) {
  const ref = useRef(null);
  const [inV, setInV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const root = el.closest('.lx') || null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInV(true); io.disconnect(); }
    }, { root, threshold: (opts && opts.threshold) || 0.15, rootMargin: (opts && opts.margin) || '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inV];
}
function Reveal({ children, d, className = '', style, tag = 'div' }) {
  const [ref, inV] = useInView();
  const Tag = tag;
  return <Tag ref={ref} className={`rv ${className} ${inV ? 'in' : ''}`} data-d={d} style={style}>{children}</Tag>;
}

/* ---- act header ---- */
function ActHead({ num, marker, title, sub }) {
  return (
    <div className="act-head">
      <Reveal className="ghost-num">{num}</Reveal>
      <div className="copy">
        <Reveal d="1" className="act-marker"><span style={{ width: 18, height: 1, background: 'var(--accent-hi)' }} />{marker}</Reveal>
        <Reveal d="2"><h2 className="act-title">{title}</h2></Reveal>
        {sub && <Reveal d="3"><p className="act-sub">{sub}</p></Reveal>}
      </div>
    </div>
  );
}

/* ---- big instrument chart ---- */
function BigChart({ data, threshold, comparator, color, w = 760, h = 280 }) {
  const c = color || 'var(--accent-hi)';
  const gid = useMemo(() => 'bc' + Math.random().toString(36).slice(2, 7), []);
  const { path, area, thY, last, lo, hi } = useMemo(() => {
    if (!data || data.length < 2) return {};
    const min = Math.min(...data, threshold), max = Math.max(...data, threshold);
    const range = (max - min) || 1; const pad = range * 0.22;
    const lo = min - pad, hi = max + pad, rng = hi - lo;
    const X = i => (i / (data.length - 1)) * w;
    const Y = v => h - ((v - lo) / rng) * h;
    let path = `M ${X(0)} ${Y(data[0])}`;
    data.forEach((v, i) => { if (i) path += ` L ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`; });
    return { path, area: path + ` L ${w} ${h} L 0 ${h} Z`, thY: Y(threshold), last: { x: X(data.length - 1), y: Y(data[data.length - 1]) }, lo, hi };
  }, [data, w, h, threshold]);
  if (!path) return <div style={{ height: h }} />;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.18" /><stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map(f => <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="var(--border-faint)" strokeWidth="1" />)}
      {/* threshold */}
      <line x1="0" y1={thY} x2={w} y2={thY} stroke="var(--warn)" strokeWidth="1" strokeDasharray="4 5" opacity="0.85" />
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* crosshair */}
      <line x1={last.x} y1="0" x2={last.x} y2={h} stroke="var(--accent-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r="3.5" fill={c} />
      <circle cx={last.x} cy={last.y} r="3.5" fill="none" stroke={c}>
        <animate attributeName="r" values="3.5;10;3.5" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ============================================================
   ACT 01 — SIGNAL DETECTED
   ============================================================ */
function ActSignal() {
  UI.useLive();
  const m = L().getMandate('0042');
  const s1 = m.signals[0], s2 = m.signals[1];
  const dist1 = (Math.abs((s1.latest - s1.threshold) / s1.threshold) * 100).toFixed(2);
  return (
    <section className="act" data-stage="0">
      <div className="lx-wrap">
        <ActHead num="01" marker="Signal detected"
          title="The desk is watching markets you can't."
          sub="A standing order resolves into measurable signals. Each one is fetched by validators, not a server — the threshold check happens in consensus." />
        <Reveal d="1" className="sig-layout">
          {/* big chart */}
          <div className="instr reg sig-chart">
            <div className="instr-hd">
              <span className="row gap2"><UI.AgentChip agent={s1.agent} size={15} /> {s1.source} · {s1.selector}</span>
              <span style={{ color: 'var(--warn)' }}>THRESHOLD {UI.CMP[s1.comparator]} {UI.fmtThresh(s1)}</span>
            </div>
            <div className="row between" style={{ padding: 'var(--s4) var(--s4) var(--s2)' }}>
              <div className="sig-readout-big">
                <span className="readout" style={{ fontSize: 'clamp(44px,6vw,72px)', color: s1.triggered ? 'var(--up)' : 'var(--text-hi)' }}>{UI.fmtSig(s1)}</span>
                <span className="col" style={{ gap: 2 }}>
                  <span className="mono" style={{ fontSize: 12, color: s1.triggered ? 'var(--up)' : 'var(--warn)' }}>{s1.triggered ? '✓ condition met' : '↓ approaching'}</span>
                  <span className="mono faint" style={{ fontSize: 11 }}>{dist1}% to trigger</span>
                </span>
              </div>
              <span className="label" style={{ alignSelf: 'flex-start' }}>{s1.label}</span>
            </div>
            <div className="grow" style={{ display: 'flex', alignItems: 'flex-end', padding: '0 0 0' }}>
              <BigChart data={s1.history} threshold={s1.threshold} comparator={s1.comparator} color={s1.triggered ? 'var(--up)' : 'var(--accent-hi)'} />
            </div>
            <div className="row between" style={{ padding: 'var(--s2) var(--s4)', borderTop: '1px solid var(--border-faint)' }}>
              {['-40m', '-30m', '-20m', '-10m', 'now'].map(t => <span key={t} className="mono faint" style={{ fontSize: 9.5 }}>{t}</span>)}
            </div>
          </div>
          {/* side */}
          <div className="sig-side">
            <div className="instr" style={{ padding: 'var(--s5)' }}>
              <div className="row between" style={{ marginBottom: 'var(--s3)' }}>
                <span className="row gap2"><UI.AgentChip agent={s2.agent} size={15} /><span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>{s2.label}</span></span>
                <span className="badge is-armed" style={{ height: 18 }}><I.Check size={9} />met</span>
              </div>
              <div className="row between" style={{ alignItems: 'flex-end' }}>
                <span className="readout" style={{ fontSize: 34, color: 'var(--up)' }}>{UI.fmtSig(s2)}</span>
                <span className="mono faint" style={{ fontSize: 11 }}>{UI.CMP[s2.comparator]} {UI.fmtThresh(s2)}</span>
              </div>
              <div style={{ marginTop: 'var(--s3)' }}>
                <UI.Sparkline data={s2.history} w={300} h={40} threshold={s2.threshold} color="var(--up)" strokeW={1.6} />
              </div>
              <div className="mono faint" style={{ fontSize: 10, marginTop: 8 }}>{s2.source} · {s2.selector}</div>
            </div>
            <div className="instr" style={{ padding: 'var(--s5)' }}>
              <span className="label">Provenance</span>
              <div className="col gap3" style={{ marginTop: 'var(--s4)' }}>
                {[['JSON API', 'typed endpoints', 'json'], ['Parse Website', 'HTML / odds boards', 'parse']].map(([n, d, a]) => (
                  <div key={n} className="row gap3">
                    <UI.AgentChip agent={a} size={22} />
                    <div className="col" style={{ gap: 1 }}><span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>{n}</span><span className="mono faint" style={{ fontSize: 10.5 }}>{d}</span></div>
                    <span className="grow" /><span className="mono" style={{ fontSize: 10, color: 'var(--up)' }}>● live</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   ACT 02 — DEBATE BEGINS  (agent node graph + deliberation log)
   ============================================================ */
function ActDebate() {
  const [ref, inV] = useInView({ threshold: 0.08, margin: '0px 0px -15% 0px' });
  const lines = [
    { v: 'val.aurelius', r: 'fra', out: 'signal[0] · LT 0.700 · parsed', ok: true, d: 0 },
    { v: 'val.cato', r: 'sgp', out: 'signal[0] · LT 0.700 · parsed', ok: true, d: 1 },
    { v: 'val.gracchus', r: 'nyc', out: 'signal[0] · LT 0.70 · parsed', ok: 'pending', d: 2 },
    { v: 'val.aurelius', r: 'fra', out: 'logic · conjunctive AND', ok: true, d: 3 },
    { v: 'val.gracchus', r: 'nyc', out: 'signal[0] · LT 0.700 · re-parsed', ok: true, d: 4 },
    { v: 'val.cato', r: 'sgp', out: 'logic · conjunctive AND', ok: true, d: 5 },
  ];
  return (
    <section className="act" data-stage="1">
      <div className="lx-wrap">
        <ActHead num="02" marker="Deliberation"
          title="Then the agents argue it out."
          sub="The thesis is dispatched to a validator subcommittee. Each runs the model independently and emits a structured spec. Early drafts diverge — that's the point." />
        <div className="debate-layout" ref={ref}>
          {/* node graph */}
          <div className="instr reg" style={{ padding: 0, position: 'relative', minHeight: 360 }}>
            <div className="instr-hd"><span>DECOMPOSER → SUBCOMMITTEE</span><span>inferString · temp 0 · seed 0x00</span></div>
            <DebateGraph active={inV} />
          </div>
          {/* deliberation log */}
          <div className="instr deliberation">
            <div className="instr-hd"><span>Deliberation log</span><span className="row gap2"><span className="pulse-dot" style={{ width: 5, height: 5 }} />streaming</span></div>
            <div style={{ flex: 1 }}>
              {lines.map((ln, i) => (
                <div key={i} className="delib-line" style={{ opacity: inV ? 1 : 0, transform: inV ? 'none' : 'translateX(10px)', transition: `all 0.5s var(--ease-out) ${ln.d * 260 + 200}ms` }}>
                  <span>{ln.ok === true ? <I.Check size={13} style={{ color: 'var(--up)' }} /> : <span className="spinner" style={{ width: 11, height: 11 }} />}</span>
                  <span style={{ color: 'var(--text-hi)' }}>{ln.v}</span>
                  <span style={{ color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ln.out}</span>
                  <span className="faint" style={{ fontSize: 9.5 }}>{ln.r}</span>
                </div>
              ))}
            </div>
            <div className="row between" style={{ padding: 'var(--s3) var(--s4)', borderTop: '1px solid var(--border-mute)' }}>
              <span className="mono faint" style={{ fontSize: 10.5 }}>3 validators · 6 responses</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--accent-hi)' }}>converging…</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
function DebateGraph({ active }) {
  const vals = [{ y: 70, n: 'aurelius' }, { y: 180, n: 'cato' }, { y: 290, n: 'gracchus' }];
  return (
    <svg width="100%" viewBox="0 0 640 360" style={{ display: 'block' }}>
      {/* edges */}
      {vals.map((v, i) => {
        const len = 360;
        return (
          <path key={i} d={`M 150 180 C 320 180, 360 ${v.y}, 480 ${v.y}`} fill="none"
            stroke={active ? 'var(--accent-line)' : 'var(--border)'} strokeWidth="1.5"
            strokeDasharray={len} strokeDashoffset={active ? 0 : len}
            style={{ transition: `stroke-dashoffset 1s var(--ease-out) ${i * 200}ms, stroke 0.6s` }} />
        );
      })}
      {/* traveling pulses */}
      {active && vals.map((v, i) => (
        <circle key={'p' + i} r="3" fill="var(--accent-hi)">
          <animateMotion dur="2.2s" begin={`${i * 0.4}s`} repeatCount="indefinite" path={`M 150 180 C 320 180, 360 ${v.y}, 480 ${v.y}`} />
        </circle>
      ))}
      {/* decomposer node */}
      <g>
        <circle cx="150" cy="180" r="34" fill="var(--accent-softer)" stroke="var(--accent-line)" strokeWidth="1.4" />
        <text x="150" y="176" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="16" fill="var(--accent-hi)" fontWeight="500">D</text>
        <text x="150" y="192" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="var(--text-mid)" letterSpacing="0.5">DECOMP</text>
      </g>
      {/* validator nodes */}
      {vals.map((v, i) => (
        <g key={'v' + i} style={{ opacity: active ? 1 : 0.3, transition: `opacity 0.6s ${i * 200 + 600}ms` }}>
          <circle cx="510" cy={v.y} r="26" fill="var(--up-soft)" stroke="var(--up-line)" strokeWidth="1.3" />
          <path d={`M 500 ${v.y} l 5 5 9 -11`} fill="none" stroke="var(--up)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="556" y={v.y + 4} fontFamily="var(--font-mono)" fontSize="11" fill="var(--text-mid)">val.{v.n}</text>
        </g>
      ))}
    </svg>
  );
}

/* ============================================================
   ACT 03 — CONSENSUS FORMS  (fingerprints align)
   ============================================================ */
function ActConsensus() {
  const [ref, inV] = useInView({ threshold: 0.3 });
  const target = '11010110';
  const drafts = ['11010010', '11010110', '01010110'];
  return (
    <section className="act" data-stage="2">
      <div className="lx-wrap">
        <ActHead num="03" marker="Consensus"
          title="Until every node computes the identical byte."
          sub="Temperature 0. Fixed seeds. The subcommittee doesn't vote on an average — finalization requires the outputs to match exactly. Divergence is rejected, not smoothed over." />
        <div className="consensus-stage" ref={ref}>
          <div className="fingerprints">
            {drafts.map((draft, i) => (
              <div key={i} className="fp">
                <span className="mono faint" style={{ fontSize: 10.5, width: 92 }}>val.{['aurelius', 'cato', 'gracchus'][i]}</span>
                <div className="fp-bits">
                  {target.split('').map((bit, j) => {
                    const settled = inV;
                    const shown = settled ? bit : draft[j];
                    return <span key={j} className={`fp-bit ${shown === '1' ? 'on' : ''}`}
                      style={{ transition: `background 0.4s ${j * 60 + i * 120 + 300}ms`, background: settled ? (bit === '1' ? 'var(--up)' : 'var(--surface-3)') : (draft[j] === target[j] ? 'var(--surface-3)' : 'var(--down)') }} />;
                  })}
                </div>
                <span className="mono" style={{ fontSize: 10.5, color: inV ? 'var(--up)' : 'var(--down)', transition: 'color 0.4s 0.9s' }}>{inV ? 'match' : 'draft'}</span>
              </div>
            ))}
            <div className="row gap3" style={{ marginTop: 'var(--s5)', alignItems: 'center', opacity: inV ? 1 : 0, transition: 'opacity 0.6s 1.1s' }}>
              <I.Shield size={20} style={{ color: 'var(--up)' }} />
              <span className="readout" style={{ fontSize: 30, color: 'var(--up)' }}>3/3</span>
              <div className="col" style={{ gap: 1 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>96.2% confidence</span>
                <span className="mono faint" style={{ fontSize: 10.5 }}>byte-level agreement · finalized</span>
              </div>
            </div>
          </div>
          <Reveal d="2" className="instr reg" style={{ padding: 0 }}>
            <div className="instr-hd"><span>FINALIZED OUTPUT · rcp_8821</span><span style={{ color: 'var(--up)' }}>● consensus</span></div>
            <pre className="code" style={{ border: 'none', borderRadius: 0, background: 'transparent', fontSize: 11.5 }}>{`{
  `}<span className="k">"conjunctive"</span>{`: `}<span className="n">true</span>{`,
  `}<span className="k">"signals"</span>{`: [
    { `}<span className="k">"source"</span>{`: `}<span className="s">"polymarket.com"</span>{`,
      `}<span className="k">"selector"</span>{`: `}<span className="s">"btc-100k.yesPrice"</span>{`,
      `}<span className="k">"cmp"</span>{`: `}<span className="s">"LT"</span>{`, `}<span className="k">"threshold"</span>{`: `}<span className="n">0.70</span>{` },
    { `}<span className="k">"source"</span>{`: `}<span className="s">"api.coinbase.com"</span>{`,
      `}<span className="k">"selector"</span>{`: `}<span className="s">"$.data.amount"</span>{`,
      `}<span className="k">"cmp"</span>{`: `}<span className="s">"GT"</span>{`, `}<span className="k">"threshold"</span>{`: `}<span className="n">4000</span>{` }
  ]
}`}</pre>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   ACT 04 — CAPITAL ALLOCATED  (execution pipeline)
   ============================================================ */
function ActCapital() {
  const nodes = [
    { t: 'Budget', v: '1.00 STT', d: 'escrowed', a: null },
    { t: 'Executor', v: 'inferToolsChat', d: 'tool calling', a: 'executor' },
    { t: 'Tool call', v: 'swap()', d: 'whitelisted selector', a: null },
    { t: 'Router', v: 'QuickSwap V4', d: '$275K TVL', a: null },
    { t: 'Pool', v: 'USDC / SOMI', d: 'settled', a: null },
  ];
  return (
    <section className="act" data-stage="3">
      <div className="lx-wrap">
        <ActHead num="04" marker="Capital allocated"
          title="The model writes the trade itself."
          sub="On trigger, the Executor is handed the mandate context and one on-chain tool. It returns ABI-encoded calldata — not a suggestion, the actual transaction the contract will send." />
        <Reveal d="1" className="pipeline">
          {nodes.map((n, i) => (
            <div key={i} className="pipe-node">
              {i < nodes.length - 1 && <span className="pipe-flow" />}
              <span className="mono faint" style={{ fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</span>
              <div className="row gap2" style={{ alignItems: 'center' }}>
                {n.a && <UI.AgentChip agent={n.a} size={18} />}
                <span className="mono" style={{ fontSize: 13.5, color: 'var(--text-hi)' }}>{n.t}</span>
              </div>
              <span className="mono" style={{ fontSize: 12, color: 'var(--accent-hi)' }}>{n.v}</span>
              <span className="grow" />
              <span className="mono faint" style={{ fontSize: 10.5 }}>{n.d}</span>
            </div>
          ))}
        </Reveal>
        <Reveal d="2" className="row gap5 wrap" style={{ marginTop: 'var(--s6)' }}>
          <div className="instr reg grow" style={{ padding: 'var(--s5)', minWidth: 300 }}>
            <span className="label">Yielded calldata · pendingToolCalls[0]</span>
            <pre className="code" style={{ border: 'none', borderRadius: 0, background: 'transparent', padding: 'var(--s3) 0 0', fontSize: 11 }}>{`executeSwap(
  tokenIn:  `}<span className="s">0xA0b8…eB48</span>{`  `}<span className="c">// USDC</span>{`
  tokenOut: `}<span className="s">0x5cc7…91Ed</span>{`  `}<span className="c">// SOMI</span>{`
  amountIn: `}<span className="n">500_000000</span>{`
  minOut:   `}<span className="n">41_160_000</span>{`     `}<span className="c">// slippage bound</span>{`
)`}</pre>
          </div>
          <div className="col gap3" style={{ minWidth: 200, justifyContent: 'center' }}>
            {[['Trade size', '500 USDC'], ['Min received', '41,160 SOMI'], ['Max slippage', '0.5%'], ['Selector', 'whitelisted ✓']].map(([k, v]) => (
              <div key={k} className="row between" style={{ borderBottom: '1px solid var(--border-faint)', paddingBottom: 8 }}>
                <span className="mono faint" style={{ fontSize: 11 }}>{k}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)' }}>{v}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

window.ACTS = { useInView, Reveal, ActHead, BigChart, ActSignal, ActDebate, ActConsensus, ActCapital };
