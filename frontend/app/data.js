/* ============================================================
   LICTOR — Mock data + live tick engine
   Exposes window.LICTOR with state, subscribe(), and a clock.
   ============================================================ */
(function () {
  const now = Date.now();
  const m = (mins) => now - mins * 60000;

  // ---- Agents ----
  const AGENTS = {
    decomposer: { id: 'llm-decompose', name: 'Decomposer', kind: 'LLM Inference', model: 'Qwen3-30B', color: 'var(--accent)', glyph: 'D' },
    json:       { id: 'json-api',      name: 'JSON API',   kind: 'Data Fetch',     model: 'HTTP/consensus', color: 'var(--up)', glyph: 'J' },
    parse:      { id: 'parse-web',     name: 'Parse Web',  kind: 'HTML Extract',   model: 'DOM/consensus',  color: 'var(--warn)', glyph: 'P' },
    executor:   { id: 'llm-execute',   name: 'Executor',   kind: 'Tool Calling',   model: 'inferToolsChat', color: 'var(--accent)', glyph: 'X' },
  };

  // ---- Validators (subcommittee of 3, but show a roster) ----
  const VALIDATORS = [
    { id: 'v-aurelius', label: 'val.aurelius', region: 'fra' },
    { id: 'v-cato',     label: 'val.cato',     region: 'sgp' },
    { id: 'v-gracchus', label: 'val.gracchus', region: 'nyc' },
    { id: 'v-brutus',   label: 'val.brutus',   region: 'lon' },
    { id: 'v-cicero',   label: 'val.cicero',   region: 'tok' },
  ];

  // ---- Signals helpers ----
  function sig(o) {
    return Object.assign({
      latest: 0, threshold: 0, decimals: 2, unit: '', comparator: 'LT',
      triggered: false, source: '', sourceType: 'JSON_API', selector: '',
      lastUpdated: m(1), history: [], health: 'live', agent: 'json',
    }, o);
  }

  // generate gentle history series
  function series(base, vol, n, drift) {
    const out = []; let v = base;
    for (let i = 0; i < n; i++) { v += (Math.random() - 0.5) * vol + (drift || 0); out.push(+v.toFixed(4)); }
    return out;
  }

  // ---- Mandates ----
  const MANDATES = [
    {
      id: '0042', code: 'LCT-0042', status: 'ARMED',
      thesis: 'Buy SOMI if Polymarket "Bitcoin > $100k in 2026" odds drop below 70% and ETH is above $4,000.',
      owner: '0x7a4f…2e9c', ownerName: 'you', conjunctive: true,
      tokenIn: 'USDC', tokenOut: 'SOMI', amountIn: 500, budget: 1.0, dexFee: 0.3,
      createdAt: m(214), armedAt: m(212), triggeredAt: null, executedAt: null,
      progress: 0.5, consensus: 0.92, nextTick: 38,
      signals: [
        sig({ id: 's1', label: 'BTC>100k odds', latest: 0.726, threshold: 0.70, comparator: 'LT', unit: '', decimals: 3,
          source: 'polymarket.com', sourceType: 'PARSE_WEBSITE', agent: 'parse', selector: 'market.bitcoin-100k-2026.yesPrice',
          health: 'live', history: series(0.78, 0.012, 40, -0.0014) }),
        sig({ id: 's2', label: 'ETH spot', latest: 4187.4, threshold: 4000, comparator: 'GT', unit: '$', decimals: 2,
          source: 'api.coinbase.com', sourceType: 'JSON_API', agent: 'json', selector: '$.data.amount',
          triggered: true, health: 'live', history: series(4080, 22, 40, 3) }),
      ],
    },
    {
      id: '0041', code: 'LCT-0041', status: 'EXECUTING',
      thesis: 'Short ETH if Polymarket recession odds break 60% and ETH drops below $2,500.',
      owner: '0x7a4f…2e9c', ownerName: 'you', conjunctive: true,
      tokenIn: 'WETH', tokenOut: 'USDC', amountIn: 1.5, budget: 1.2, dexFee: 0.05,
      createdAt: m(640), armedAt: m(636), triggeredAt: m(7), executedAt: null,
      progress: 0.9, consensus: 0.88, nextTick: 0,
      signals: [
        sig({ id: 's1', label: 'Recession odds', latest: 0.63, threshold: 0.60, comparator: 'GT', unit: '', decimals: 2,
          source: 'polymarket.com', sourceType: 'PARSE_WEBSITE', agent: 'parse', selector: 'market.us-recession-2026.yesPrice',
          triggered: true, health: 'live', history: series(0.55, 0.01, 40, 0.002) }),
        sig({ id: 's2', label: 'ETH spot', latest: 2476.1, threshold: 2500, comparator: 'LT', unit: '$', decimals: 2,
          source: 'api.coinbase.com', sourceType: 'JSON_API', agent: 'json', selector: '$.data.amount',
          triggered: true, health: 'live', history: series(2560, 16, 40, -2.2) }),
      ],
    },
    {
      id: '0039', code: 'LCT-0039', status: 'EXECUTED',
      thesis: 'Buy SOMI if the network surpasses 1M daily active addresses.',
      owner: '0x3c91…8b2a', ownerName: 'val.cato', conjunctive: true,
      tokenIn: 'USDC', tokenOut: 'SOMI', amountIn: 1200, budget: 0.8, dexFee: 0.3,
      createdAt: m(2880), armedAt: m(2870), triggeredAt: m(420), executedAt: m(418),
      progress: 1, consensus: 0.96, nextTick: null, pnl: +14.2, fill: 41992.4,
      signals: [
        sig({ id: 's1', label: 'Daily active addr', latest: 1.04e6, threshold: 1e6, comparator: 'GT', unit: '', decimals: 0,
          source: 'api.somnia.network', sourceType: 'JSON_API', agent: 'json', selector: '$.metrics.dau',
          triggered: true, health: 'live', history: series(960000, 9000, 40, 2400) }),
      ],
    },
    {
      id: '0037', code: 'LCT-0037', status: 'ARMED',
      thesis: 'Buy WETH if BTC dominance falls under 52% and total crypto market cap holds above $2.4T.',
      owner: '0x9d22…1f04', ownerName: 'val.cicero', conjunctive: true,
      tokenIn: 'USDC', tokenOut: 'WETH', amountIn: 800, budget: 1.5, dexFee: 0.05,
      createdAt: m(1440), armedAt: m(1432), triggeredAt: null, executedAt: null,
      progress: 0.5, consensus: 0.90, nextTick: 51,
      signals: [
        sig({ id: 's1', label: 'BTC dominance', latest: 53.1, threshold: 52, comparator: 'LT', unit: '%', decimals: 1,
          source: 'api.coingecko.com', sourceType: 'JSON_API', agent: 'json', selector: '$.data.btc_dominance',
          health: 'live', history: series(54.2, 0.18, 40, -0.03) }),
        sig({ id: 's2', label: 'Total mcap', latest: 2.51e12, threshold: 2.4e12, comparator: 'GT', unit: '$', decimals: 0,
          source: 'api.coingecko.com', sourceType: 'JSON_API', agent: 'json', selector: '$.data.total_mcap',
          triggered: true, health: 'live', history: series(2.46e12, 9e9, 40, 1e9) }),
      ],
    },
    {
      id: '0035', code: 'LCT-0035', status: 'PENDING',
      thesis: 'Buy SOMI if a major exchange lists SOMI perpetuals.',
      owner: '0x7a4f…2e9c', ownerName: 'you', conjunctive: true,
      tokenIn: 'USDC', tokenOut: 'SOMI', amountIn: 300, budget: 0.6, dexFee: 0.3,
      createdAt: m(2), armedAt: null, triggeredAt: null, executedAt: null,
      progress: 0.15, consensus: null, nextTick: null,
      signals: [],
    },
    {
      id: '0033', code: 'LCT-0033', status: 'FAILED',
      thesis: 'Swap USDC to WETH if gas drops below 8 gwei on settlement.',
      owner: '0x5e77…aa31', ownerName: 'val.brutus', conjunctive: true,
      tokenIn: 'USDC', tokenOut: 'WETH', amountIn: 2000, budget: 0.9, dexFee: 0.05,
      createdAt: m(4320), armedAt: m(4310), triggeredAt: m(900), executedAt: null,
      progress: 0.8, consensus: 0.71, nextTick: null, failReason: 'Swap reverted — slippage exceeded minOut',
      signals: [
        sig({ id: 's1', label: 'Gas price', latest: 7.4, threshold: 8, comparator: 'LT', unit: ' gwei', decimals: 1,
          source: 'api.somnia.network', sourceType: 'JSON_API', agent: 'json', selector: '$.gas.fast',
          triggered: true, health: 'stale', history: series(9, 0.4, 40, -0.06) }),
      ],
    },
  ];

  // ---- Timeline events for a mandate (detail view) ----
  function buildTimeline(man) {
    const ev = [];
    ev.push({ phase: 'SUBMITTED', agent: null, at: man.createdAt, txt: 'Mandate posted with thesis, token pair, and budget.', tx: '0x91ad…44e2', receipt: null });
    if (man.armedAt) ev.push({ phase: 'DECOMPOSED', agent: 'decomposer', at: man.armedAt, txt: `Thesis parsed into ${man.signals.length} structured signal${man.signals.length>1?'s':''}.`, tx: '0x2b7c…9f10', receipt: 'rcp_8821', consensus: 0.94, validators: 3 });
    if (man.armedAt) ev.push({ phase: 'MONITORING', agent: 'json', at: man.armedAt + 60000, txt: 'Signal subcommittees dispatched. Continuous threshold checks active.', tx: null, receipt: 'rcp_8822' });
    if (man.triggeredAt) ev.push({ phase: 'TRIGGERED', agent: null, at: man.triggeredAt, txt: 'All conditions satisfied under thesis logic (AND).', tx: '0x4f01…77ab', receipt: null, consensus: man.consensus });
    if (man.status === 'EXECUTING') ev.push({ phase: 'EXECUTING', agent: 'executor', at: man.triggeredAt + 5000, txt: 'Executor yielding swap calldata via inferToolsChat. Validating against selector whitelist.', tx: null, receipt: 'rcp_8841', live: true });
    if (man.executedAt) {
      ev.push({ phase: 'EXECUTING', agent: 'executor', at: man.executedAt - 4000, txt: 'Executor returned swap calldata. Selector validated against whitelist.', tx: '0x77de…02c4', receipt: 'rcp_8841', consensus: 0.96 });
      ev.push({ phase: 'EXECUTED', agent: null, at: man.executedAt, txt: `Swap settled on QuickSwap V4. Filled ${man.fill ? man.fill.toLocaleString() : ''} ${man.tokenOut}.`, tx: '0x88fe…11a9', receipt: 'rcp_8842' });
    }
    if (man.status === 'FAILED') ev.push({ phase: 'FAILED', agent: null, at: man.triggeredAt + 6000, txt: man.failReason, tx: '0x09bb…ee21', receipt: 'rcp_8901', fail: true });
    return ev.reverse();
  }

  // ---- Receipts (Stripe-style event log) ----
  const RECEIPT_TYPES = ['Decompose', 'Signal · JSON', 'Signal · Parse', 'Execute'];
  function genReceipts(n) {
    const out = [];
    const agents = ['decomposer', 'json', 'parse', 'executor'];
    const results = ['Success', 'Success', 'Success', 'Success', 'Success', 'TimedOut', 'Failed'];
    for (let i = 0; i < n; i++) {
      const a = agents[Math.floor(Math.random() * agents.length)];
      const res = results[Math.floor(Math.random() * results.length)];
      const man = MANDATES[Math.floor(Math.random() * MANDATES.length)];
      out.push({
        id: 'req_' + (982341 - i * 7).toString(36).toUpperCase(),
        agent: a, agentName: AGENTS[a].name,
        result: res, mandate: man.code,
        consensus: res === 'Success' ? (0.86 + Math.random() * 0.12) : (0.4 + Math.random() * 0.2),
        validators: 3, latency: Math.floor(800 + Math.random() * 2400),
        at: m(i * 3 + Math.random() * 4), deposit: (0.12 + Math.random() * 0.3),
      });
    }
    return out;
  }
  const RECEIPTS = genReceipts(48);

  // ---- Public feed ----
  const FEED = [
    { id: 'f1', actor: 'val.cato', action: 'executed', mandate: 'LCT-0039', detail: 'Bought 41,992 SOMI', at: m(2), kind: 'exec', amt: '+$1,200' },
    { id: 'f2', actor: 'anon.7a4f', action: 'armed', mandate: 'LCT-0042', detail: '2 signals monitoring', at: m(6), kind: 'arm' },
    { id: 'f3', actor: 'val.cicero', action: 'triggered', mandate: 'LCT-0037', detail: 'BTC dominance crossed 52%', at: m(11), kind: 'trigger' },
    { id: 'f4', actor: 'anon.5e77', action: 'submitted', mandate: 'LCT-0044', detail: 'Short SOL if funding flips negative', at: m(14), kind: 'submit' },
    { id: 'f5', actor: 'anon.9d22', action: 'failed', mandate: 'LCT-0033', detail: 'Slippage exceeded minOut', at: m(22), kind: 'fail' },
    { id: 'f6', actor: 'val.brutus', action: 'executed', mandate: 'LCT-0031', detail: 'Swapped 2.0 WETH → 5,184 USDC', at: m(31), kind: 'exec', amt: '+$84' },
    { id: 'f7', actor: 'anon.3c91', action: 'decomposed', mandate: 'LCT-0043', detail: 'Thesis parsed into 3 signals', at: m(38), kind: 'decompose' },
    { id: 'f8', actor: 'val.gracchus', action: 'armed', mandate: 'LCT-0040', detail: '1 signal monitoring', at: m(44), kind: 'arm' },
  ];

  // ---- Analytics series ----
  const ANALYTICS = {
    mandatesCreated: 1284,
    executionRate: 0.873,
    avgConsensusMs: 1840,
    agentCalls: 9472,
    volumeRouted: 4.82e6,
    successRate: 0.961,
    volSeries: series(120, 30, 30, 4).map(v => Math.max(20, Math.round(v))),
    execSeries: Array.from({ length: 30 }, () => 0.8 + Math.random() * 0.18),
    consensusSeries: series(1700, 200, 30, 8).map(v => Math.round(v)),
  };

  // ============================================================
  //  LIVE ENGINE — ticks signals, advances state, notifies subs
  // ============================================================
  const subs = new Set();
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) {} }); }

  function tick() {
    MANDATES.forEach(man => {
      if (man.status === 'ARMED' || man.status === 'EXECUTING') {
        man.signals.forEach(s => {
          if (s.health === 'stale') return;
          const last = s.history[s.history.length - 1];
          let drift = 0;
          // nudge un-triggered signals gently toward their threshold for liveliness
          if (!s.triggered) {
            const dir = (s.comparator === 'LT' || s.comparator === 'LTE') ? -1 : 1;
            drift = dir * Math.abs(last) * 0.0006;
          }
          const vol = Math.abs(last) * 0.0014;
          let next = last + (Math.random() - 0.5) * 2 * vol + drift;
          if (next < 0) next = Math.abs(next);
          s.history.push(+next.toFixed(s.decimals > 4 ? 4 : 6));
          if (s.history.length > 60) s.history.shift();
          s.latest = next;
          s.lastUpdated = Date.now();
          // re-evaluate trigger
          const cmp = s.comparator;
          const t = s.threshold;
          s.triggered = (cmp === 'LT') ? next < t : (cmp === 'LTE') ? next <= t :
                        (cmp === 'GT') ? next > t : (cmp === 'GTE') ? next >= t : Math.abs(next - t) < t * 0.001;
        });
        const trg = man.signals.filter(s => s.triggered).length;
        man.progress = man.signals.length ? 0.5 + 0.4 * (trg / man.signals.length) : man.progress;
        if (typeof man.nextTick === 'number' && man.nextTick > 0) man.nextTick = Math.max(0, man.nextTick - 1);
        if (man.nextTick === 0) man.nextTick = 30 + Math.floor(Math.random() * 30);
        // tiny consensus jitter
        if (man.consensus) man.consensus = Math.min(0.99, Math.max(0.7, man.consensus + (Math.random() - 0.5) * 0.004));
      }
    });
    notify();
  }

  let timer = setInterval(tick, 1100);

  window.LICTOR = {
    AGENTS, VALIDATORS, MANDATES, RECEIPTS, FEED, ANALYTICS, RECEIPT_TYPES,
    buildTimeline, series,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    getMandate(id) { return MANDATES.find(x => x.id === id); },
    fmtAgo(ts) {
      const s = Math.floor((Date.now() - ts) / 1000);
      if (s < 60) return s + 's ago';
      const mn = Math.floor(s / 60); if (mn < 60) return mn + 'm ago';
      const h = Math.floor(mn / 60); if (h < 24) return h + 'h ago';
      return Math.floor(h / 24) + 'd ago';
    },
    fmtNum(n, d) {
      if (n == null) return '—';
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (Math.abs(n) >= 1e3 && d == null) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
      return n.toLocaleString(undefined, { minimumFractionDigits: d || 0, maximumFractionDigits: d != null ? d : 2 });
    },
  };
})();
