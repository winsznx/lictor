import { useAccount, usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { type Address, type PublicClient } from 'viem'
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

// ─── Mandate enumeration ──────────────────────────────────────────────────────

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const MAX_SCAN = 256 // runaway guard; real stop is the first empty mandate slot

/**
 * Enumerate mandates by reading getMandate(0..N) until an empty slot.
 *
 * We deliberately avoid getLogs: Somnia caps eth_getLogs at 1000 blocks, far below
 * the deploy→head range (~1.5M blocks), so a full-range scan errors out. Mandate ids
 * are sequential from 0, so reading until owner == address(0) is correct and cheap for
 * the current scale. (A production indexer or a paginated contract getter would scale further.)
 */
export async function enumerateMandates(
  client: PublicClient,
  lictor: Address,
): Promise<{ id: bigint; m: OnChainMandate }[]> {
  const out: { id: bigint; m: OnChainMandate }[] = []
  for (let i = 0n; i < BigInt(MAX_SCAN); i++) {
    const m = (await client.readContract({
      address: lictor,
      abi: lictorAbi,
      functionName: 'getMandate',
      args: [i],
    })) as unknown as OnChainMandate
    if (m.owner.toLowerCase() === ZERO_ADDRESS) break
    out.push({ id: i, m })
  }
  return out
}

// ─── Hook: all mandates for connected wallet ──────────────────────────────────

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
      const all = await enumerateMandates(client, cfg.lictor)

      return all
        .filter(({ m }) => m.owner.toLowerCase() === address.toLowerCase())
        .map(({ id, m }) => adaptMandate(id, m))
        .sort((a, b) => Number(b.createdAt - a.createdAt))
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
