/* ============================================================
   LICTOR — Icon set (stroke, 1.6, currentColor)
   ============================================================ */
const I = {};
function mkIcon(paths) {
  return function Icon({ size = 16, stroke = 1.6, style, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
        style={style} className={className} aria-hidden="true">
        {paths}
      </svg>
    );
  };
}

I.Desk = mkIcon(<><rect x="3" y="4" width="18" height="14" rx="1.5"/><path d="M3 9h18M8 18v2m8-2v2M6 22h12"/></>);
I.Grid = mkIcon(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>);
I.Pulse = mkIcon(<path d="M3 12h3.5l2-7 4 14 2.5-9 1.5 2H21"/>);
I.Receipt = mkIcon(<><path d="M6 2h12v20l-2-1.4L14 22l-2-1.4L10 22l-2-1.4L6 22V2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></>);
I.Chart = mkIcon(<><path d="M4 4v16h16"/><path d="M8 14l3-4 3 2 4-6"/></>);
I.Feed = mkIcon(<><circle cx="5" cy="6" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="5" cy="18" r="1.6"/><path d="M10 6h10M10 12h10M10 18h7"/></>);
I.Settings = mkIcon(<><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10l2.1 2.1M19.1 4.9l-2.1 2.1m-10 10l-2.1 2.1"/></>);
I.Book = mkIcon(<><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5Z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20"/></>);
I.Search = mkIcon(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>);
I.Plus = mkIcon(<path d="M12 5v14M5 12h14"/>);
I.Bell = mkIcon(<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>);
I.Wallet = mkIcon(<><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M16 12h2.5M2.5 9h19"/></>);
I.Arrow = mkIcon(<path d="M5 12h14m-6-6 6 6-6 6"/>);
I.ArrowUp = mkIcon(<path d="M12 19V5m-6 6 6-6 6 6"/>);
I.ArrowDown = mkIcon(<path d="M12 5v14m6-6-6 6-6-6"/>);
I.Check = mkIcon(<path d="M4 12.5 9 17.5 20 6.5"/>);
I.CheckCircle = mkIcon(<><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></>);
I.X = mkIcon(<path d="M6 6l12 12M18 6 6 18"/>);
I.XCircle = mkIcon(<><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>);
I.Dot = mkIcon(<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>);
I.Chevron = mkIcon(<path d="m9 6 6 6-6 6"/>);
I.ChevronD = mkIcon(<path d="m6 9 6 6 6-6"/>);
I.Clock = mkIcon(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>);
I.Bolt = mkIcon(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>);
I.Shield = mkIcon(<><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z"/><path d="m9 12 2 2 4-4"/></>);
I.Layers = mkIcon(<><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>);
I.Signal = mkIcon(<><path d="M3 20v-4m5 4v-9m5 9V7m5 13V3"/></>);
I.Nodes = mkIcon(<><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 8 11 16m5.5-8L13 16M8 6h8"/></>);
I.Cmd = mkIcon(<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z"/>);
I.Copy = mkIcon(<><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></>);
I.External = mkIcon(<><path d="M14 4h6v6m0-6L10 14"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></>);
I.Filter = mkIcon(<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>);
I.Eye = mkIcon(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.5"/></>);
I.Refresh = mkIcon(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16m0 5v-5h5"/></>);
I.Coin = mkIcon(<><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/></>);
I.Logo = function Logo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 3 6.2v6.4C3 18 7 21.4 12 23c5-1.6 9-5 9-10.4V6.2L12 2Z" fill="var(--surface-3)" stroke="var(--border-strong)" strokeWidth="1.2"/>
      <path d="M9.4 7.2v7.1h5.4" stroke="var(--accent-hi)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="14.8" cy="14.3" r="1.15" fill="var(--accent-hi)"/>
    </svg>
  );
};

window.I = I;
