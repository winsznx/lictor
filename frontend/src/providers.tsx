import React from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import { somniaTestnet, somniaMainnet } from './lib/chain'
import '@rainbow-me/rainbowkit/styles.css'

const wagmiConfig = getDefaultConfig({
  appName: 'LICTOR',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'lictor-testnet',
  chains: [somniaMainnet, somniaTestnet],
  ssr: false,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 10_000 },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: 'var(--accent-hi)', borderRadius: 'large' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
