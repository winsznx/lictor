/* ============================================================
   LICTOR — App shell: sidebar, topbar, command bar, router
   ============================================================ */

const NAV = [
  { id: 'desk',      label: 'Desk',       icon: 'Desk',     hash: '#/desk' },
  { id: 'mandates',  label: 'Mandates',   icon: 'Layers',   hash: '#/mandate/0042' },
  { id: 'signals',   label: 'Signals',    icon: 'Signal',   hash: '#/signals' },
  { id: 'consensus', label: 'Consensus',  icon: 'Nodes',    hash: '#/consensus' },
  { id: 'receipts',  label: 'Receipts',   icon: 'Receipt',  hash: '#/receipts' },
  { id: 'feed',      label: 'Public Feed',icon: 'Feed',     hash: '#/feed' },
  { id: 'analytics', label: 'Analytics',  icon: 'Chart',    hash: '#/analytics' },
];
const NAV2 = [
  { id: 'settings', label: 'Settings', icon: 'Settings', hash: '#/settings' },
  { id: 'docs',     label: 'Docs',     icon: 'Book',     hash: '#/docs' },
];

function Sidebar({ route, onCmd }) {
  const active = route.name;
  const Item = ({ it }) => {
    const Icon = I[it.icon];
    const isActive = active === it.id || (it.id === 'mandates' && route.name === 'mandate');
    return (
      <a href={it.hash} className="nav-item" data-active={isActive}>
        <Icon size={17} />
        <span>{it.label}</span>
      </a>
    );
  };
  return (
    <aside className="sidebar">
      <div className="side-top">
        <a href="#/desk" className="brand">
          <I.Logo size={22} />
          <span className="brand-name">LICTOR</span>
          <span className="brand-net">testnet</span>
        </a>
      </div>
      <button className="cmd-trigger" onClick={onCmd}>
        <I.Search size={14} />
        <span>Search or run…</span>
        <span className="kbd" style={{ marginLeft: 'auto' }}>⌘K</span>
      </button>
      <nav className="nav-group">
        {NAV.map(it => <Item key={it.id} it={it} />)}
      </nav>
      <div className="grow" />
      <nav className="nav-group">
        {NAV2.map(it => <Item key={it.id} it={it} />)}
      </nav>
      <div className="side-foot">
        <div className="row gap2 center" style={{ justifyContent: 'flex-start' }}>
          <span className="pulse-dot up" />
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mid)' }}>Shannon · 50312</span>
        </div>
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="mono faint" style={{ fontSize: 9.5 }}>block 8,412,772</span>
          <span className="mono faint" style={{ fontSize: 9.5 }}>~0.4s</span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, sub, actions, onCmd }) {
  UI.useLive();
  return (
    <header className="topbar">
      <div className="col" style={{ gap: 1, minWidth: 0 }}>
        <div className="row gap2" style={{ minWidth: 0 }}>
          <h1 className="h4" style={{ fontWeight: 560 }}>{title}</h1>
        </div>
        {sub && <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      </div>
      <div className="grow" />
      <div className="row gap2">
        {actions}
        <button className="btn-icon top-search" onClick={onCmd}><I.Search size={16} /></button>
        <button className="btn-icon"><I.Bell size={16} /><span className="bell-dot" /></button>
        <div className="wallet-chip">
          <span className="pulse-dot up" style={{ width: 5, height: 5 }} />
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-hi)' }}>0x7a4f…2e9c</span>
          <span className="mono faint" style={{ fontSize: 10.5 }}>· 18.4 STT</span>
        </div>
      </div>
    </header>
  );
}

/* ---- Command palette ---- */
const CMDS = [
  { label: 'New mandate', hint: 'compose', icon: 'Plus', hash: '#/create', kind: 'action' },
  { label: 'Go to Desk', icon: 'Desk', hash: '#/desk' },
  { label: 'Mandate LCT-0042', hint: 'Buy SOMI if…', icon: 'Layers', hash: '#/mandate/0042' },
  { label: 'Mandate LCT-0041', hint: 'Short ETH if…', icon: 'Layers', hash: '#/mandate/0041' },
  { label: 'Signals monitor', icon: 'Signal', hash: '#/signals' },
  { label: 'Consensus view', icon: 'Nodes', hash: '#/consensus' },
  { label: 'Receipts explorer', icon: 'Receipt', hash: '#/receipts' },
  { label: 'Public feed', icon: 'Feed', hash: '#/feed' },
  { label: 'Analytics', icon: 'Chart', hash: '#/analytics' },
  { label: 'Settings', icon: 'Settings', hash: '#/settings' },
  { label: 'Documentation', icon: 'Book', hash: '#/docs' },
  { label: 'View landing page', icon: 'External', hash: '#/', kind: 'nav' },
];
function CommandBar({ open, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const list = useMemo(() => CMDS.filter(c => (c.label + (c.hint || '')).toLowerCase().includes(q.toLowerCase())), [q]);
  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 30); } }, [open]);
  useEffect(() => { setSel(0); }, [q]);
  const go = (c) => { if (c) { location.hash = c.hash; onClose(); } };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(list.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(list[sel]); }
    else if (e.key === 'Escape') onClose();
  };
  if (!open) return null;
  return (
    <div className="cmd-overlay" onMouseDown={onClose}>
      <div className="cmd-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="cmd-input-row">
          <I.Search size={17} style={{ color: 'var(--text-lo)' }} />
          <input ref={inputRef} className="cmd-input" placeholder="Search mandates, run a command…"
            value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} />
          <span className="kbd">esc</span>
        </div>
        <div className="cmd-list">
          {list.length === 0 && <div className="cmd-empty mono">No matches</div>}
          {list.map((c, i) => {
            const Icon = I[c.icon] || I.Dot;
            return (
              <button key={c.label} className="cmd-row" data-sel={i === sel}
                onMouseEnter={() => setSel(i)} onClick={() => go(c)}>
                <Icon size={15} style={{ color: i === sel ? 'var(--accent-hi)' : 'var(--text-lo)' }} />
                <span style={{ color: 'var(--text-hi)' }}>{c.label}</span>
                {c.hint && <span className="mono faint" style={{ fontSize: 11 }}>{c.hint}</span>}
                {c.kind === 'action' && <span className="badge" style={{ marginLeft: 'auto', height: 18 }}>↵</span>}
              </button>
            );
          })}
        </div>
        <div className="cmd-foot">
          <span className="row gap2"><span className="kbd">↑</span><span className="kbd">↓</span><span className="mono faint" style={{ fontSize: 10.5 }}>navigate</span></span>
          <span className="row gap2"><span className="kbd">↵</span><span className="mono faint" style={{ fontSize: 10.5 }}>open</span></span>
        </div>
      </div>
    </div>
  );
}

/* ---- Toasts ---- */
const ToastCtx = React.createContext(null);
function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { ...t, id }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), t.duration || 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-host">
        {toasts.map(t => {
          const Icon = t.kind === 'success' ? I.CheckCircle : t.kind === 'error' ? I.XCircle : I.Bolt;
          const col = t.kind === 'success' ? 'var(--up)' : t.kind === 'error' ? 'var(--down)' : 'var(--accent-hi)';
          return (
            <div key={t.id} className="toast">
              <Icon size={17} style={{ color: col, flex: 'none', marginTop: 1 }} />
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <span style={{ color: 'var(--text-hi)', fontSize: 13, fontWeight: 500 }}>{t.title}</span>
                {t.body && <span className="mono faint" style={{ fontSize: 11 }}>{t.body}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => React.useContext(ToastCtx);

/* ---- App layout wrapper (sidebar + content) ---- */
function AppFrame({ route, children }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(o => !o); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div className="app-shell">
      <Sidebar route={route} onCmd={() => setCmdOpen(true)} />
      <div className="app-main">
        {React.cloneElement(children, { onCmd: () => setCmdOpen(true) })}
      </div>
      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}

window.SHELL = { Sidebar, Topbar, CommandBar, AppFrame, ToastHost, useToast, NAV };
