import React, { useState, useEffect, lazy, Suspense } from 'react'
import { AppFrame, ToastHost } from './shell'

// ─── Route parsing ────────────────────────────────────────────────────────────

type Route = { name: string; arg?: string }

function parseHash(): Route {
  const h = (location.hash || '#/').replace(/^#/, '')
  const parts = h.split('/').filter(Boolean)
  if (parts.length === 0) return { name: 'landing' }
  const [head, arg] = parts
  const MAP: Record<string, string> = {
    desk: 'desk', create: 'create', mandate: 'mandate', signals: 'signals',
    consensus: 'consensus', receipts: 'receipts', feed: 'feed',
    analytics: 'analytics', settings: 'settings', docs: 'docs',
  }
  return { name: MAP[head] ?? 'landing', arg }
}

// ─── Lazy route imports ───────────────────────────────────────────────────────

const Landing   = lazy(() => import('../routes/landing'))
const Desk      = lazy(() => import('../routes/desk'))
const Create    = lazy(() => import('../routes/create'))
const Mandate   = lazy(() => import('../routes/mandate'))
const Signals   = lazy(() => import('../routes/signals'))
const Consensus = lazy(() => import('../routes/consensus'))
const Receipts  = lazy(() => import('../routes/receipts'))
const Analytics = lazy(() => import('../routes/analytics'))
const Settings  = lazy(() => import('../routes/settings'))
const Docs      = lazy(() => import('../routes/docs'))
const Feed      = lazy(() => import('../routes/feed'))

function PageFallback() {
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <span className="mono faint" style={{ fontSize: 12 }}>Loading…</span>
    </div>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────

export function App() {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash())
      document.querySelector('.page')?.scrollTo(0, 0)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const routeName = route.name

  if (routeName === 'landing') {
    return (
      <Suspense fallback={null}>
        <Landing />
      </Suspense>
    )
  }

  let page: React.ReactNode
  switch (routeName) {
    case 'desk':      page = <Desk />; break
    case 'create':    page = <Create />; break
    case 'mandate':   page = <Mandate id={route.arg ?? '0'} key={route.arg} />; break
    case 'signals':   page = <Signals />; break
    case 'consensus': page = <Consensus />; break
    case 'receipts':  page = <Receipts />; break
    case 'feed':      page = <Feed />; break
    case 'analytics': page = <Analytics />; break
    case 'settings':  page = <Settings />; break
    case 'docs':      page = <Docs />; break
    default:          page = <Desk />
  }

  return (
    <AppFrame routeName={routeName}>
      <Suspense fallback={<PageFallback />}>
        {page}
      </Suspense>
    </AppFrame>
  )
}

export function Root() {
  useEffect(() => {
    const boot = document.getElementById('boot')
    if (boot) {
      boot.classList.add('gone')
      setTimeout(() => boot.remove(), 350)
    }
  }, [])

  return (
    <ToastHost>
      <App />
    </ToastHost>
  )
}
