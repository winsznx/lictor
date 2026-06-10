import React from 'react'
import ReactDOM from 'react-dom/client'
import { Providers } from './providers'
import { Root } from './app/router'

// Design system styles (resolved relative to this file; Vite bundles them)
import '../styles/lictor.css'
import '../styles/app.css'
import '../styles/components.css'
import '../styles/landing.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <Root />
    </Providers>
  </React.StrictMode>,
)
