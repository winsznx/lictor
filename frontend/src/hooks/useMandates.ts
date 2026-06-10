import { useAccount, usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { parseAbiItem, type Address } from 'viem'
import { lictorAbi } from '../lib/abi'
import { chainCfg, tokenSymbol, statusLabel, comparatorLabel } from '../lib/chain'
import { mandateCode, sourceTypeAgent, fmtAgo } from '../lib/utils'

// ─── On-chain types ───────────────────────────────────────────────────────────

export type OnChainSignal = {
  sourceType: number
  sourceUrl: string
  parseSelector: string
  comparator: number
  threshold: bigint
  decimals: number
  latestValue: bigint
  lastUpdated: bigint
  triggered: boolean
  lastRequestId: bigint
}

export type OnChainMandate = {
  owner: Address
  thesis: string
  budgetWei: bigint
  signals: readonly OnChainSignal[]
  conjunctive: boolean
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  minOut: bigint
  status: number
  createdAt: bigint
  triggeredAt: bigint
  executedAt: bigint
}

// ─── Display types (derived from on-chain) ────────────────────────────────────

export type DisplaySignal = OnChainSignal & {
  idx: number
  agent: 'json' | 'parse'
  source: string
  cmpLabel: string
  health: 'live' | 'stale'
  displayValue: number
  displayThreshold: number
}

export type DisplayMandate = Omit<OnChainMandate, 'signals'> & {
  mandateId: bigint
  code: string
  statusLabel: string
  tokenInSymbol: string
  tokenOutSymbol: string
  signals: DisplaySignal[]
  ageStr: string
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

const STALE_S = 5 * 60 // 5 minutes, mirrors contract REFRESH_INTERVAL

function adaptSignal(s: OnChainSignal, idx: number): DisplaySignal {
  const nowSec = BigInt(Math.floor(Date.now() / 1000))
  const staleSecs = nowSec - s.lastUpdated
  const dec = s.decimals
  const scale = Math.pow(10, dec)
  return {
    ...s,
    idx,
    agent: sourceTypeAgent(s.sourceType),
    source: new URL(s.sourceUrl).hostname,
    cmpLabel: comparatorLabel(s.comparator),
    health: Number(staleSecs) > STALE_S ? 'stale' : 'live',
    displayValue: Number(s.latestValue) / scale,
    displayThreshold: Number(s.threshold) / scale,
  }
}

function adaptMandate(mandateId: bigint, m: OnChainMandate): DisplayMandate {
  return {
    ...m,
    mandateId,
    code: mandateCode(mandateId),
    statusLabel: statusLabel(m.status),
    tokenInSymbol: tokenSymbol(m.tokenIn),
    tokenOutSymbol: tokenSymbol(m.tokenOut),
    signals: (m.signals as OnChainSignal[]).map(adaptSignal),
    ageStr: fmtAgo(m.createdAt),
  }
}

// ─── Hook: all mandates for connected wallet ──────────────────────────────────

const mandateSubmittedEvent = parseAbiItem(
  'event MandateSubmitted(uint256 indexed mandateId, address indexed owner, string thesis, address tokenIn, address tokenOut, uint256 amountIn)',
)

export function useMandates() {
  const { address } = useAccount()
  const client = usePublicClient()

  return useQuery({
    queryKey: ['mandates', address, client?.chain?.id],
    enabled: !!address && !!client,
    refetchInterval: 30_000,
    queryFn: async (): Promise<DisplayMandate[]> => {
      if (!address || !client) return []

      const cfg = chainCfg(client.chain?.id)
      const latest = await client.getBlockNumber()
      const logs = await client.getLogs({
        address: cfg.lictor,
        event: mandateSubmittedEvent,
        args: { owner: address },
        fromBlock: cfg.deployBlock,
        toBlock: latest,
      })

      const mandateIds = logs
        .map((log) => log.args.mandateId)
        .filter((id): id is bigint => id !== undefined)

      const mandates = await Promise.all(
        mandateIds.map(async (mandateId) => {
          const m = await client.readContract({
            address: cfg.lictor,
            abi: lictorAbi,
            functionName: 'getMandate',
            args: [mandateId],
          })
          return adaptMandate(mandateId, m as unknown as OnChainMandate)
        }),
      )

      // Most recent first
      return mandates.sort((a, b) => Number(b.createdAt - a.createdAt))
    },
  })
}

// ─── Hook: single mandate ─────────────────────────────────────────────────────

export function useMandate(mandateId: bigint | undefined) {
  const client = usePublicClient()

  return useQuery({
    queryKey: ['mandate', mandateId?.toString(), client?.chain?.id],
    enabled: mandateId !== undefined && !!client,
    refetchInterval: 15_000,
    queryFn: async (): Promise<DisplayMandate | null> => {
      if (mandateId === undefined || !client) return null
      const cfg = chainCfg(client.chain?.id)
      const m = await client.readContract({
        address: cfg.lictor,
        abi: lictorAbi,
        functionName: 'getMandate',
        args: [mandateId],
      })
      return adaptMandate(mandateId, m as unknown as OnChainMandate)
    },
  })
}
