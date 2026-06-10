import React, { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, type ReactNode } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useBlockNumber } from 'wagmi'
import { formatEther } from 'viem'
import * as Icons from './icons'

// ─── Command open context ─────────────────────────────────────────────────────

const CmdOpenCtx = createContext<() => void>(() => {})
export const useCmdOpen = () => useContext(CmdOpenCtx)

// ─── Nav ──────────────────────────────────────────────────────────────────────

export type NavItem = { id: string; label: string; icon: keyof typeof Icons; hash: string }

const NAV: NavItem[] = [
  { id: 'desk',      label: 'Desk',        icon: 'Desk',     hash: '#/desk' },
  { id: 'mandates',  label: 'Mandates',    icon: 'Layers',   hash: '#/mandate/0' },
  { id: 'signals',   label: 'Signals',     icon: 'Signal',   hash: '#/signals' },
  { id: 'consensus', label: 'Agent Logs',  icon: 'Nodes',    hash: '#/consensus' },
  { id: 'receipts',  label: 'Receipts',    icon: 'Receipt',  hash: '#/receipts' },
  { id: 'feed',      label: 'Public Feed', icon: 'Feed',     hash: '#/feed' },
  { id: 'analytics', label: 'Analytics',   icon: 'Chart',    hash: '#/analytics' },
]

const NAV2: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: 'Settings', hash: '#/settings' },
  { id: 'docs',     label: 'Docs',     icon: 'Book',     hash: '#/docs' },
]

const BOTTOM_TABS: NavItem[] = [
  { id: 'desk',     label: 'Desk',     icon: 'Desk',    hash: '#/desk' },
  { id: 'mandates', label: 'Mandates', icon: 'Layers',  hash: '#/mandate/0' },
  { id: 'signals',  label: 'Signals',  icon: 'Signal',  hash: '#/signals' },
  { id: 'receipts', label: 'Receipts', icon: 'Receipt', hash: '#/receipts' },
]

const MORE_NAV: NavItem[] = [
  { id: 'consensus', label: 'Agent Logs', icon: 'Nodes',    hash: '#/consensus' },
  { id: 'feed',      label: 'Feed',       icon: 'Feed',     hash: '#/feed' },
  { id: 'analytics', label: 'Analytics',  icon: 'Chart',    hash: '#/analytics' },
  { id: 'settings',  label: 'Settings',   icon: 'Settings', hash: '#/settings' },
  { id: 'docs',      label: 'Docs',       icon: 'Book',     hash: '#/docs' },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ routeName, onCmd }: { routeName: string; onCmd: () => void }) {
  const { data: blockNumber } = useBlockNumber({ watch: true })

  function NavItem({ it }: { it: NavItem }) {
    const Icon = Icons[it.icon] as React.ComponentType<{ size?: number }>
    const isActive = routeName === it.id || (it.id === 'mandates' && routeName === 'mandate')
    return (
      <a href={it.hash} className="nav-item" data-active={isActive}>
        <Icon size={17} />
        <span>{it.label}</span>
      </a>
    )
  }

  return (
    <aside className="sidebar">
      <div className="side-top">
        <a href="#/desk" className="brand">
          <Icons.Logo size={22} />
          <span className="brand-name">LICTOR</span>
          <span className="brand-net">testnet</span>
        </a>
      </div>
      <button className="cmd-trigger" onClick={onCmd}>
        <Icons.Search size={14} />
        <span>Search or run…</span>
        <span className="kbd" style={{ marginLeft: 'auto' }}>⌘K</span>
      </button>
      <nav className="nav-group">
        {NAV.map(it => <NavItem key={it.id} it={it} />)}
      </nav>
      <div className="grow" />
      <nav className="nav-group">
        {NAV2.map(it => <NavItem key={it.id} it={it} />)}
      </nav>
      <div className="side-foot">
        <div className="row gap2 center" style={{ justifyContent: 'flex-start' }}>
          <span className="pulse-dot up" />
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mid)' }}>Shannon · 50312</span>
        </div>
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="mono faint" style={{ fontSize: 9.5 }}>
            {blockNumber ? `block ${blockNumber.toLocaleString()}` : '…'}
          </span>
          <span className="mono faint" style={{ fontSize: 9.5 }}>~0.4s</span>
        </div>
      </div>
    </aside>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar({ title, sub, actions, onCmd }: {
  title: ReactNode
  sub?: string
  actions?: React.ReactNode
  onCmd?: () => void
}) {
  const openCmd = useCmdOpen()
  const handleCmd = onCmd ?? openCmd
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })

  return (
    <header className="topbar">
      <div className="col" style={{ gap: 1, minWidth: 0 }}>
        <div className="row gap2" style={{ minWidth: 0 }}>
          <h1 className="h4" style={{ fontWeight: 560 }}>{title}</h1>
        </div>
        {sub && (
          <span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sub}
          </span>
        )}
      </div>
      <div className="grow" />
      <div className="row gap2">
        {actions && <div className="topbar-actions row gap2">{actions}</div>}
        <button className="btn-icon top-search" onClick={handleCmd}><Icons.Search size={16} /></button>
        <button className="btn-icon"><Icons.Bell size={16} /><span className="bell-dot" /></button>
        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, mounted }) => {
            if (!mounted || !account || !chain) {
              return (
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 999 }} onClick={openConnectModal}>
                  Connect
                </button>
              )
            }
            const balStr = balance ? parseFloat(formatEther(balance.value)).toFixed(2) : null
            return (
              <div className="wallet-chip" style={{ cursor: 'pointer' }} onClick={openConnectModal}>
                <span className="pulse-dot up" style={{ width: 5, height: 5 }} />
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-hi)' }}>
                  {account.address.slice(0, 6)}…{account.address.slice(-4)}
                </span>
                {balStr && (
                  <span className="mono faint" style={{ fontSize: 10.5 }}>· {balStr} {balance?.symbol ?? ''}</span>
                )}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  )
}

// ─── Mobile navigation ────────────────────────────────────────────────────────

export function MobileNav({ routeName }: { routeName: string }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const openCmd = useCmdOpen()
  const isMoreActive = MORE_NAV.some(it => routeName === it.id)

  return (
    <>
      <nav className="mobile-nav">
        {BOTTOM_TABS.map(it => {
          const Icon = Icons[it.icon] as React.ComponentType<{ size?: number }>
          const isActive = routeName === it.id || (it.id === 'mandates' && routeName === 'mandate')
          return (
            <a key={it.id} href={it.hash} className="mobile-tab" data-active={isActive}>
              <span className="mobile-tab-icon"><Icon size={18} /></span>
              <span>{it.label}</span>
            </a>
          )
        })}
        <button
          className="mobile-tab"
          data-active={isMoreActive || moreOpen}
          onClick={() => setMoreOpen(o => !o)}
        >
          <span className="mobile-tab-icon"><Icons.Grid size={18} /></span>
          <span>More</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="mobile-more-overlay" onClick={() => setMoreOpen(false)}>
          <div className="mobile-more-sheet" onClick={e => e.stopPropagation()}>
            <div className="mobile-more-handle" />
            <div className="mobile-more-grid">
              {MORE_NAV.map(it => {
                const Icon = Icons[it.icon] as React.ComponentType<{ size?: number }>
                const isActive = routeName === it.id
                return (
                  <a key={it.id} href={it.hash} className="mobile-more-item" data-active={isActive}
                    onClick={() => setMoreOpen(false)}>
                    <Icon size={22} />
                    <span>{it.label}</span>
                  </a>
                )
              })}
              <button className="mobile-more-item" onClick={() => { setMoreOpen(false); openCmd() }}>
                <Icons.Search size={22} />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Command palette ──────────────────────────────────────────────────────────

const CMDS = [
  { label: 'New mandate',       hint: 'compose',      icon: 'Plus',     hash: '#/create',    kind: 'action' },
  { label: 'Go to Desk',        icon: 'Desk',         hash: '#/desk' },
  { label: 'Signals monitor',   icon: 'Signal',       hash: '#/signals' },
  { label: 'Agent Logs',        icon: 'Nodes',        hash: '#/consensus' },
  { label: 'Receipts explorer', icon: 'Receipt',      hash: '#/receipts' },
  { label: 'Public feed',       icon: 'Feed',         hash: '#/feed' },
  { label: 'Analytics',         icon: 'Chart',        hash: '#/analytics' },
  { label: 'Settings',          icon: 'Settings',     hash: '#/settings' },
  { label: 'Documentation',     icon: 'Book',         hash: '#/docs' },
] as const

export function CommandBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const list = useMemo(() => CMDS.filter(c => (c.label + ('hint' in c ? c.hint : '')).toLowerCase().includes(q.toLowerCase())), [q])

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => { setSel(0) }, [q])

  const go = (c: (typeof CMDS)[number] | undefined) => {
    if (c) { location.hash = c.hash; onClose() }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(list.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(list[sel]) }
    else if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div className="cmd-overlay" onMouseDown={onClose}>
      <div className="cmd-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="cmd-input-row">
          <Icons.Search size={17} style={{ color: 'var(--text-lo)' }} />
          <input ref={inputRef} className="cmd-input" placeholder="Search mandates, run a command…"
            value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} />
          <span className="kbd">esc</span>
        </div>
        <div className="cmd-list">
          {list.length === 0 && <div className="cmd-empty mono">No matches</div>}
          {list.map((c, i) => {
            const Icon = (Icons[c.icon as keyof typeof Icons] ?? Icons.Dot) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>
            return (
              <button key={c.label} className="cmd-row" data-sel={i === sel}
                onMouseEnter={() => setSel(i)} onClick={() => go(c)}>
                <Icon size={15} style={{ color: i === sel ? 'var(--accent-hi)' : 'var(--text-lo)' }} />
                <span style={{ color: 'var(--text-hi)' }}>{c.label}</span>
                {'hint' in c && c.hint && <span className="mono faint" style={{ fontSize: 11 }}>{c.hint}</span>}
                {'kind' in c && c.kind === 'action' && <span className="badge" style={{ marginLeft: 'auto', height: 18 }}>↵</span>}
              </button>
            )
          })}
        </div>
        <div className="cmd-foot">
          <span className="row gap2"><span className="kbd">↑</span><span className="kbd">↓</span><span className="mono faint" style={{ fontSize: 10.5 }}>navigate</span></span>
          <span className="row gap2"><span className="kbd">↵</span><span className="mono faint" style={{ fontSize: 10.5 }}>open</span></span>
        </div>
      </div>
    </div>
  )
}

// ─── Toasts ───────────────────────────────────────────────────────────────────

type Toast = { id: string; title: string; body?: string; kind?: 'success' | 'error' | 'info'; duration?: number }
type ToastFn = (t: Omit<Toast, 'id'>) => void

const ToastCtx = createContext<ToastFn | null>(null)

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback<ToastFn>((t) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(ts => [...ts, { ...t, id }])
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), t.duration ?? 4200)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-host">
        {toasts.map(t => {
          const Icon = t.kind === 'success' ? Icons.CheckCircle : t.kind === 'error' ? Icons.XCircle : Icons.Bolt
          const col = t.kind === 'success' ? 'var(--up)' : t.kind === 'error' ? 'var(--down)' : 'var(--accent-hi)'
          return (
            <div key={t.id} className="toast">
              <Icon size={17} style={{ color: col, flex: 'none', marginTop: 1 }} />
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <span style={{ color: 'var(--text-hi)', fontSize: 13, fontWeight: 500 }}>{t.title}</span>
                {t.body && <span className="mono faint" style={{ fontSize: 11 }}>{t.body}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

// ─── App frame ────────────────────────────────────────────────────────────────

export function AppFrame({ routeName, children }: { routeName: string; children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <CmdOpenCtx.Provider value={() => setCmdOpen(true)}>
      <div className="app-shell">
        <Sidebar routeName={routeName} onCmd={() => setCmdOpen(true)} />
        <div className="app-main">
          {children}
        </div>
        <MobileNav routeName={routeName} />
        <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
      </div>
    </CmdOpenCtx.Provider>
  )
}
