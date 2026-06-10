import { useState, useEffect } from 'react'
import { useReadContract, useWatchContractEvent } from 'wagmi'
import { lictorAbi } from '../lib/abi'
import { comparatorLabel, sourceTypeAgent } from '../lib/utils'
import { useChainCfg } from './useChainCfg'
import type { DisplaySignal, OnChainSignal } from './useMandates'

const STALE_S = 5 * 60

function adaptSignal(s: OnChainSignal, idx: number): DisplaySignal {
  const nowSec = BigInt(Math.floor(Date.now() / 1000))
  const staleSecs = nowSec - s.lastUpdated
  const scale = Math.pow(10, s.decimals)
  let hostname = s.sourceUrl
  try { hostname = new URL(s.sourceUrl).hostname } catch { /* keep raw URL */ }
  return {
    ...s,
    idx,
    agent: sourceTypeAgent(s.sourceType),
    source: hostname,
    cmpLabel: comparatorLabel(s.comparator),
    health: Number(staleSecs) > STALE_S ? 'stale' : 'live',
    displayValue: Number(s.latestValue) / scale,
    displayThreshold: Number(s.threshold) / scale,
  }
}

export function useSignals(mandateId: bigint | undefined) {
  const [signals, setSignals] = useState<DisplaySignal[]>([])
  const cfg = useChainCfg()

  const { data, isLoading } = useReadContract({
    address: cfg.lictor,
    abi: lictorAbi,
    functionName: 'getSignals',
    args: mandateId !== undefined ? [mandateId] : undefined,
    query: { enabled: mandateId !== undefined, refetchInterval: 30_000 },
  })

  useEffect(() => {
    if (data) {
      setSignals((data as OnChainSignal[]).map(adaptSignal))
    }
  }, [data])

  // Watch for real-time SignalUpdated events and patch the local state
  useWatchContractEvent({
    address: cfg.lictor,
    abi: lictorAbi,
    eventName: 'SignalUpdated',
    args: mandateId !== undefined ? { mandateId } : undefined,
    enabled: mandateId !== undefined,
    onLogs(logs) {
      for (const log of logs) {
        const { signalIdx, latestValue, triggered } = log.args as {
          signalIdx: bigint
          latestValue: bigint
          triggered: boolean
        }
        setSignals((prev) =>
          prev.map((s, i) => {
            if (i !== Number(signalIdx)) return s
            const updated: OnChainSignal = { ...s, latestValue, triggered, lastUpdated: BigInt(Math.floor(Date.now() / 1000)) }
            return adaptSignal(updated, i)
          }),
        )
      }
    },
  })

  return { signals, isLoading }
}
