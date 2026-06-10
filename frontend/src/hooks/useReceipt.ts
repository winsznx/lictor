import { useChainId } from 'wagmi'
import { receiptUrl } from '../lib/chain'

// Returns the receipt viewer URL for a given request ID on the connected chain.
// No fetch needed — the link goes directly to the receipts API page.
export function useReceipt(requestId: bigint | undefined): string | null {
  const chainId = useChainId()
  if (requestId === undefined || requestId === 0n) return null
  return receiptUrl(requestId, chainId)
}
