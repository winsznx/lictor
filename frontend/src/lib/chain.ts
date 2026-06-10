import { defineChain } from 'viem'

export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Shannon Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.infra.testnet.somnia.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Shannon Explorer',
      url: 'https://shannon-explorer.somnia.network',
    },
  },
})

export const somniaMainnet = defineChain({
  id: 5031,
  name: 'Somnia',
  nativeCurrency: { name: 'SOMI', symbol: 'SOMI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.infra.mainnet.somnia.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://explorer.somnia.network',
    },
  },
})

export const MAINNET_CHAIN_ID = 5031
export const TESTNET_CHAIN_ID = 50312

export const LICTOR_TESTNET_ADDRESS = '0x8c5f99096252e506d6fcbc28147395b4092bc01f' as const
export const LICTOR_MAINNET_ADDRESS = '0xf02c982d19184c11b86bc34672441c45fbf0f93e' as const

export const TESTNET_DEPLOY_BLOCK = 401410492n
export const MAINNET_DEPLOY_BLOCK = 328480687n

export const PLATFORM_TESTNET_ADDRESS = '0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776' as const
export const PLATFORM_MAINNET_ADDRESS = '0x5E5205CF39E766118C01636bED000A54D93163E6' as const

export type ChainCfg = {
  chainId: number
  isMainnet: boolean
  label: string
  symbol: string
  lictor: `0x${string}`
  platform: `0x${string}`
  deployBlock: bigint
  explorerBase: string
  receiptBase: string
  agentsUrl: string
  rpc: string
}

const MAINNET_CFG: ChainCfg = {
  chainId: MAINNET_CHAIN_ID,
  isMainnet: true,
  label: 'Somnia · 5031',
  symbol: 'SOMI',
  lictor: LICTOR_MAINNET_ADDRESS,
  platform: PLATFORM_MAINNET_ADDRESS,
  deployBlock: MAINNET_DEPLOY_BLOCK,
  explorerBase: 'https://explorer.somnia.network',
  receiptBase: 'https://agents.somnia.network/receipts',
  agentsUrl: 'https://agents.somnia.network',
  rpc: 'https://api.infra.mainnet.somnia.network',
}

const TESTNET_CFG: ChainCfg = {
  chainId: TESTNET_CHAIN_ID,
  isMainnet: false,
  label: 'Shannon · 50312',
  symbol: 'STT',
  lictor: LICTOR_TESTNET_ADDRESS,
  platform: PLATFORM_TESTNET_ADDRESS,
  deployBlock: TESTNET_DEPLOY_BLOCK,
  explorerBase: 'https://shannon-explorer.somnia.network',
  receiptBase: 'https://agents.testnet.somnia.network/receipts',
  agentsUrl: 'https://agents.testnet.somnia.network',
  rpc: 'https://api.infra.testnet.somnia.network',
}

export function chainCfg(chainId?: number): ChainCfg {
  return chainId === MAINNET_CHAIN_ID ? MAINNET_CFG : TESTNET_CFG
}

// Algebra Integral DEX (mainnet) — used for quotes + execution
export const ALGEBRA_DEPLOYER = '0x0361B4883FfD676BB0a4642B3139D38A33e452f5' as const
export const QUOTER_V2 = '0xcB68373404a835268D3ED76255C8148578A82b77' as const

export const USDC_E = '0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00' as const
export const WSOMI = '0x046EDe9564A72571df6F5e44d0405360c0f4dCab' as const

export const TOKEN_SYMBOLS: Record<string, string> = {
  '0x28bec7e30e6faee657a03e19bf1128aad7632a00': 'USDC.e',
  '0x046ede9564a72571df6f5e44d0405360c0f4dcab': 'WSOMI',
}

export const TOKEN_DECIMALS: Record<string, number> = {
  '0x28bec7e30e6faee657a03e19bf1128aad7632a00': 6,
  '0x046ede9564a72571df6f5e44d0405360c0f4dcab': 18,
}

export function tokenSymbol(addr: string): string {
  return TOKEN_SYMBOLS[addr.toLowerCase()] ?? `${addr.slice(0, 6)}…`
}

export function tokenDecimals(addr: string): number {
  return TOKEN_DECIMALS[addr.toLowerCase()] ?? 18
}

export const STATUS_LABELS = [
  'PENDING',
  'ARMED',
  'TRIGGERED',
  'EXECUTING',
  'EXECUTED',
  'FAILED',
] as const

export type StatusLabel = (typeof STATUS_LABELS)[number]

export function statusLabel(n: number): StatusLabel {
  return STATUS_LABELS[n] ?? 'PENDING'
}

export const COMPARATOR_LABELS = ['>', '≥', '<', '≤', '='] as const

export function comparatorLabel(n: number): string {
  return COMPARATOR_LABELS[n] ?? '?'
}

export function receiptUrl(requestId: bigint, chainId?: number): string {
  return `${chainCfg(chainId).receiptBase}/${requestId.toString()}`
}

export function explorerTx(txHash: string, chainId?: number): string {
  return `${chainCfg(chainId).explorerBase}/tx/${txHash}`
}

export function explorerAddress(addr: string, chainId?: number): string {
  return `${chainCfg(chainId).explorerBase}/address/${addr}`
}
