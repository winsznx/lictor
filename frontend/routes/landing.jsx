/* ============================================================
   LICTOR — Landing v2 (cinematic execution narrative)
   Command strip · live hero · execution trace · 6 acts · terminal close
   ============================================================ */

/* ---- Live mandate centerpiece (hero) ---- */
const LD_PHASES = ['monitoring', 'converging', 'triggered', 'executing', 'executed'];
function LiveDesk() {
  const [phase, setPhase] = useState(0);
  const [s1, setS1] = useState(0.726);
  const [s2, setS2] = useState(4187);
  const [hist1, setHist1] = useState(() => L().series(0.78, 0.01, 32, -0.0016));
  const [hist2, setHist2] = useState(() => L().series(4070, 18, 32, 4));
  const [log, setLog] = useState([]);
  useEffect(() => {
    const id = setInterval(() => {
      setS1(v => { const nv = Math.max(0.66, v - 0.0022 + (Math.random() - 0.5) * 0.004); setHist1(h => [...h.slice(-31), nv]); return nv; });
      setS2(v => { const nv = v + 1.6 + (Math.random() - 0.5) * 8; setHist2(h => [...h.slice(-31), nv]); return nv; });
    }, 900);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    let timers = [];
    const addLog = (entry) => setLog(l => [...l.slice(-5), { ...entry, id: Math.random() }]);
    const run = () => {
      setPhase(0); setLog([]);
      timers.push(setTimeout(() => addLog({ a: 'json', t: 'ETH spot above $4,000 — signal met', ok: true }), 600));
      timers.push(setTimeout(() => { setPhase(1); addLog({ a: 'parse', t: 'Polymarket odds crossing 0.70…', ok: null }); }, 3000));
      timers.push(setTimeout(() => { setPhase(2); setS1(0.688); addLog({ a: 'parse', t: 'BTC>100k odds 0.688 — signal met', ok: true }); }, 5200));
      timers.push(setTimeout(() => addLog({ a: null, t: 'All conditions satisfied (AND) — triggering', ok: 'trigger' }), 6000));
      timers.push(setTimeout(() => { setPhase(3); addLog({ a: 'executor', t: 'inferToolsChat → swap(USDC, SOMI, 500)', ok: null }); }, 7000));
      timers.push(setTimeout(() => addLog({ a: 'executor', t: 'Calldata validated · selector whitelisted', ok: true }), 8600));
      timers.push(setTimeout(() => { setPhase(4); addLog({ a: null, t: 'Swap settled — filled 41,992 SOMI', ok: 'exec' }); }, 9800));
      timers.push(setTimeout(run, 14500));
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, []);
  const sig1Met = phase >= 2;
  return (
    <div className="livedesk">
      <div className="livedesk-hd">
        <div className="ld-dots"><span /><span /><span /></div>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>lictor / desk</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-hi)' }}>LCT-0042</span>
        <div className="grow" />
        <span className="badge is-live"><span className="pulse-dot" style={{ width: 5, height: 5 }} />live</span>
      </div>
      <div className="livedesk-body">
        <div className="ld-left">
          <span className="label">Standing order</span>
          <p style={{ fontSize: 13.5, color: 'var(--text-hi)', lineHeight: 1.5, margin: '8px 0 16px', letterSpacing: '-0.01em' }}>
            Buy <span className="mono" style={{ color: 'var(--accent-hi)' }}>SOMI</span> if Polymarket
            <span style={{ color: 'var(--text-hi)' }}> “BTC &gt; $100k”</span> odds drop below 70% and ETH is above $4,000.
          </p>
          <div className="col gap4">
            <LDSignal label="BTC>100k odds" value={s1.toFixed(3)} cmp="<" thr="0.70" met={sig1Met} hist={hist1} agent="parse" col={sig1Met ? 'var(--up)' : 'var(--warn)'} thrLine={0.70} />
            <LDSignal label="ETH spot" value={'$' + Math.round(s2).toLocaleString()} cmp=">" thr="$4,000" met={true} hist={hist2} agent="json" col="var(--up)" thrLine={4000} />
          </div>
        </div>
        <div className="ld-right">
          <div className="row between" style={{ marginBottom: 4 }}>
            <span className="label">Agent activity</span><span className="mono faint" style={{ fontSize: 10 }}>3 validators</span>
          </div>
          <div className="col gap2" style={{ flex: 1, minHeight: 168 }}>
            {log.map((e) => (
              <div key={e.id} className="row gap2" style={{ animation: 'fadeUp 0.35s var(--ease-out) both', alignItems: 'flex-start' }}>
                <span style={{ marginTop: 1, flex: 'none' }}>
                  {e.ok === true ? <I.CheckCircle size={14} style={{ color: 'var(--up)' }} />
                    : e.ok === 'trigger' ? <I.Bolt size={14} style={{ color: 'var(--accent-hi)' }} />
                    : e.ok === 'exec' ? <I.Check size={14} style={{ color: 'var(--up)' }} />
                    : <span className="spinner" style={{ width: 13, height: 13 }} />}
                </span>
                {e.a && <UI.AgentChip agent={e.a} size={15} />}
                <span className="mono" style={{ fontSize: 11.5, color: e.ok === 'trigger' || e.ok === 'exec' ? 'var(--text-hi)' : 'var(--text-mid)', lineHeight: 1.4 }}>{e.t}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 'var(--s3)', borderTop: '1px solid var(--border-mute)' }}>
            <div className="row between">
              <span className="row gap2">
                {[0, 1, 2].map(i => <span key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--up-soft)', border: '1px solid var(--up-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.Check size={9} style={{ color: 'var(--up)' }} /></span>)}
                <span className="mono" style={{ fontSize: 11, color: 'var(--up)' }}>3/3 consensus</span>
              </span>
              <span className="mono" style={{ fontSize: 11, color: phase >= 4 ? 'var(--up)' : 'var(--accent-hi)' }}>
                {phase >= 4 ? 'EXECUTED' : phase >= 3 ? 'EXECUTING' : phase >= 2 ? 'TRIGGERED' : 'MONITORING'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function LDSignal({ label, value, cmp, thr, met, hist, agent, col, thrLine }) {
  return (
    <div>
      <div className="row between" style={{ marginBottom: 4 }}>
        <span className="row gap2">
          {met ? <I.CheckCircle size={13} style={{ color: 'var(--up)' }} /> : <span style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid var(--warn)' }} />}
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>{label}</span>
          <UI.AgentChip agent={agent} size={14} />
        </span>
        <span className="row gap2"><span className="mono" style={{ fontSize: 13, color: 'var(--text-hi)' }}>{value}</span><span className="mono faint" style={{ fontSize: 10.5 }}>{cmp} {thr}</span></span>
      </div>
      <UI.Sparkline data={hist} w={300} h={30} threshold={thrLine} color={col} glow={met} strokeW={1.5} />
    </div>
  );
}

/* ---- Execution trace (sticky lifecycle spine) ---- */
function ExecutionTrace({ active, onJump, hidden }) {
  UI.useLive();
  const m = L().getMandate('0042');
  const s1 = m.signals[0];
  const stages = [
    { name: 'Signal', val: UI.fmtSig(s1) },
    { name: 'Debate', val: '3 agents' },
    { name: 'Consensus', val: '96.2%' },
    { name: 'Capital', val: '500 USDC' },
    { name: 'Execution', val: '+41,992' },
    { name: 'Receipts', val: '5 calls' },
  ];
  return (
    <div className="trace" data-hidden={hidden ? 'true' : 'false'}>
      <div className="trace-inner">
        {stages.map((st, i) => {
          const state = i === active ? 'active' : i < active ? 'done' : 'idle';
          return (
            <button key={i} className="trace-stage" data-state={state} onClick={() => onJump(i)}>
              <div className="ts-top">
                <span className="ts-dot" />
                <span className="ts-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="ts-name">{st.name}</span>
              </div>
              <span className="ts-val">{st.val}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Social glyphs ---- */
const SOC = {
  discord: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.32 4.94A19.8 19.8 0 0 0 15.45 3.4a13.7 13.7 0 0 0-.62 1.28 18.3 18.3 0 0 0-5.46 0A13.6 13.6 0 0 0 8.74 3.4 19.7 19.7 0 0 0 3.87 4.95C.77 9.6-.08 14.12.34 18.58a19.9 19.9 0 0 0 6.07 3.08c.49-.67.92-1.38 1.3-2.12-.71-.27-1.4-.6-2.04-1 .17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.16 0c.16.14.33.27.5.4-.65.4-1.34.73-2.05 1 .38.74.81 1.45 1.3 2.12a19.8 19.8 0 0 0 6.08-3.08c.5-5.18-.85-9.65-3.93-13.64ZM8.3 15.84c-1.18 0-2.15-1.08-2.15-2.4 0-1.34.95-2.42 2.15-2.42s2.17 1.09 2.15 2.41c0 1.33-.95 2.41-2.15 2.41Zm7.4 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.34.95-2.42 2.15-2.42s2.17 1.09 2.15 2.41c0 1.33-.94 2.41-2.15 2.41Z"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2H21.5l-7.5 8.57L22.5 22h-6.9l-5.4-7.06L4 22H.74l8.02-9.17L1.5 2h7.06l4.88 6.45L18.24 2Zm-1.2 18h1.9L7.06 4H5.02l12.02 16Z"/></svg>,
  telegram: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.94 4.3 18.6 20.05c-.25 1.1-.9 1.37-1.83.86l-5.05-3.72-2.43 2.34c-.27.27-.5.5-1.02.5l.36-5.16L16.9 7.3c.41-.36-.09-.56-.63-.2L6.6 13.05l-4.98-1.55c-1.08-.34-1.1-1.08.23-1.6L20.5 2.74c.9-.33 1.69.2 1.44 1.56Z"/></svg>,
};

/* ---- Top nav: full-width bar that condenses into a floating pill ---- */
function TopNav({ scrolled }) {
  const links = [
    { label: 'System', href: '#/' },
    { label: 'Consensus', href: '#/consensus' },
    { label: 'Receipts', href: '#/receipts' },
    { label: 'Docs', href: '#/docs' },
  ];
  return (
    <nav className="lnav2" data-scrolled={scrolled ? 'true' : 'false'}>
      <div className="lnav2-inner">
        <a href="#/" className="nav-brand">
          <I.Logo size={20} />
          <span className="nav-wordmark">LICTOR</span>
        </a>
        <span className="nav-tag">AUTONOMOUS EXECUTION LAYER</span>
        <span className="nav-div opt" />
        <div className="nav-links">
          {links.map(l => <a key={l.label} href={l.href}>{l.label}</a>)}
        </div>
        <div className="nav-spacer" />
        <div className="nav-soc">
          <a href="#/" aria-label="Discord">{SOC.discord}</a>
          <a href="#/" aria-label="X">{SOC.x}</a>
          <a href="#/" aria-label="Telegram">{SOC.telegram}</a>
        </div>
        <span className="nav-div" />
        <a href="#/create" className="btn btn-primary nav-cta">Open a Desk</a>
      </div>
    </nav>
  );
}

/* ---- Landing ---- */
function Landing() {
  const scrollRef = useRef(null);
  const [active, setActive] = useState(-1);
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState(1284);
  useEffect(() => { const id = setInterval(() => setCount(v => v + (Math.random() < 0.4 ? 1 : 0)), 2600); return () => clearInterval(id); }, []);
  useEffect(() => {
    const root = scrollRef.current; if (!root) return;
    const onScroll = () => setScrolled(root.scrollTop > 40);
    root.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => root.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const root = scrollRef.current; if (!root) return;
    const secs = [...root.querySelectorAll('[data-stage]')];
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActive(+e.target.dataset.stage); });
    }, { root, rootMargin: '-46% 0px -46% 0px', threshold: 0 });
    secs.forEach(s => io.observe(s));
    // detect hero (above first act) → active -1
    const heroIo = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(-1); }, { root, rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    const hero = root.querySelector('.lx-hero'); if (hero) heroIo.observe(hero);
    return () => { io.disconnect(); heroIo.disconnect(); };
  }, []);
  const jump = (i) => {
    const root = scrollRef.current; if (!root) return;
    const el = root.querySelector(`[data-stage="${i}"]`);
    if (el) root.scrollTo({ top: el.offsetTop - 110, behavior: 'smooth' });
  };
  const A = window.ACTS;

  return (
    <div className="lx" ref={scrollRef}>
      {/* TOP NAV — full-width bar → floating pill on scroll */}
      <TopNav scrolled={scrolled} />

      {/* EXECUTION TRACE */}
      <ExecutionTrace active={active} onJump={jump} hidden={scrolled} />

      {/* HERO */}
      <section className="lx-hero">
        <div className="lx-wrap">
          <div className="hero-grid">
            <div>
              <div className="hero-tag"><span className="pulse-dot up" style={{ width: 5, height: 5 }} /> STANDING ORDER · LCT-0042 · <span style={{ color: 'var(--up)' }}>ARMED</span></div>
              <h1 className="lx-h1">State a thesis.<br /><span className="accent">Agents execute.</span></h1>
              <div className="hero-thesis">
                Buy <span className="tk">SOMI</span> if Polymarket <span className="hl">“BTC &gt; $100k”</span> odds drop below 70% <span style={{ color: 'var(--text-lo)' }}>AND</span> ETH is above $4,000.
              </div>
              <div className="hero-status">
                <span className="row gap2"><span className="pulse-dot" style={{ width: 5, height: 5 }} />monitoring 2 signals</span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span>next evaluation <span style={{ color: 'var(--text-hi)' }}>00:38</span></span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span>no operator in the loop</span>
              </div>
              <div className="hero-cta2">
                <a href="#/create" className="btn btn-primary btn-lg">Open a Desk <I.Arrow size={16} /></a>
                <a href="#/desk" className="btn btn-secondary btn-lg"><I.Eye size={15} />Watch live execution</a>
              </div>
            </div>
            <div className="rv in"><LiveDesk /></div>
          </div>
          {/* scroll cue */}
          <div className="row gap3" style={{ marginTop: 'var(--s10)', alignItems: 'center', color: 'var(--text-lo)' }}>
            <span className="tick-rule" style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Follow one order through the system</span>
            <I.ChevronD size={14} />
            <span className="tick-rule" style={{ flex: 1 }} />
          </div>
        </div>
      </section>

      {/* ACTS */}
      <A.ActSignal />
      <A.ActDebate />
      <A.ActConsensus />
      <A.ActCapital />
      <A.ActExecution />
      <A.ActReceipts />

      {/* CLOSING TERMINAL */}
      <section className="close-term">
        <div className="lx-wrap">
          <div className="act-marker" style={{ marginBottom: 'var(--s5)' }}><span style={{ width: 18, height: 1, background: 'var(--accent-hi)' }} />Issue your order</div>
          <h2 style={{ fontSize: 'clamp(32px,4.4vw,60px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, color: 'var(--text-hi)', maxWidth: '16ch', marginBottom: 'var(--s7)' }}>
            The desk is open. Write one sentence.
          </h2>
          <a href="#/create" className="term-prompt" style={{ textDecoration: 'none' }}>
            <span className="mono" style={{ color: 'var(--accent-hi)', fontSize: 16 }}>&gt;</span>
            <span className="mono" style={{ color: 'var(--text-lo)', fontSize: 15, flex: 1 }}>state your thesis<span className="caret" /></span>
            <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>Decompose <I.Arrow size={13} /></span>
          </a>
          <div className="row gap5 wrap" style={{ marginTop: 'var(--s7)' }}>
            {[['96.1%', 'execution success'], ['1.8s', 'median consensus'], ['$4.82M', 'volume routed'], ['5', 'agent calls / mandate']].map(([n, l]) => (
              <div key={l} className="col" style={{ gap: 2 }}>
                <span className="readout" style={{ fontSize: 24 }}>{n}</span>
                <span className="label" style={{ fontSize: 9.5 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="lx-foot">
        <span className="row gap2"><I.Logo size={16} />LICTOR · SHANNON TESTNET · BUILT ON SOMNIA</span>
        <span>STATE A THESIS. AGENTS EXECUTE.</span>
      </footer>
    </div>
  );
}

window.ROUTES = window.ROUTES || {};
window.ROUTES.Landing = Landing;
