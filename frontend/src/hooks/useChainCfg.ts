import { useChainId } from 'wagmi'
import { chainCfg, type ChainCfg } from '../lib/chain'

/** Returns the chain-appropriate Lictor config for the connected wallet chain. */
export function useChainCfg(): ChainCfg {
  return chainCfg(useChainId())
}
