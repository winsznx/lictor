/* ============================================================
   LICTOR — Router + mount
   ============================================================ */
function parseHash() {
  const h = (location.hash || '#/').replace(/^#/, '');
  const parts = h.split('/').filter(Boolean); // ['mandate','0042']
  if (parts.length === 0) return { name: 'landing' };
  const [head, arg] = parts;
  const map = {
    desk: 'desk', create: 'create', mandate: 'mandate', signals: 'signals',
    consensus: 'consensus', receipts: 'receipts', feed: 'feed',
    analytics: 'analytics', settings: 'settings', docs: 'docs',
  };
  return { name: map[head] || 'landing', arg };
}

function App() {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); document.querySelector('.page')?.scrollTo(0,0); window.scrollTo(0,0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const R = window.ROUTES;
  // Landing renders without the app frame
  if (route.name === 'landing') return <R.Landing />;

  let page;
  switch (route.name) {
    case 'desk':      page = <R.Desk />; break;
    case 'create':    page = <R.CreateMandate />; break;
    case 'mandate':   page = <R.MandateDetail id={route.arg || '0042'} key={route.arg} />; break;
    case 'signals':   page = <R.Signals />; break;
    case 'consensus': page = <R.Consensus />; break;
    case 'receipts':  page = <R.Receipts />; break;
    case 'feed':      page = <R.PublicFeed />; break;
    case 'analytics': page = <R.Analytics />; break;
    case 'settings':  page = <R.Settings />; break;
    case 'docs':      page = <R.Docs />; break;
    default:          page = <R.Desk />;
  }
  return <SHELL.AppFrame route={route}>{page}</SHELL.AppFrame>;
}

function Root() {
  return (
    <SHELL.ToastHost>
      <App />
    </SHELL.ToastHost>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
