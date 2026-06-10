import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Topbar } from '../app/shell'
import { CopyBtn } from '../app/ui'
import { useChainCfg } from '../hooks/useChainCfg'

export default function Settings() {
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })
  const cfg = useChainCfg()

  return (
    <>
      <Topbar title="Settings" sub="Account, network, contract addresses" />
      <div className="page">
        <div className="page-pad" style={{ maxWidth: 760 }}>
          <div className="panel" style={{ padding: 'var(--s6)', marginBottom: 'var(--s5)' }}>
            <h2 className="h3" style={{ marginBottom: 'var(--s5)' }}>Wallet</h2>
            <div className="col gap4">
              {address ? (
                <>
                  <dl className="kv">
                    <dt>Address</dt>
                    <dd className="mono row gap2" style={{ fontSize: 12 }}>
                      {address.slice(0, 10)}…{address.slice(-8)}
                      <CopyBtn text={address} size={12} />
                    </dd>
                    {balance && (
                      <>
                        <dt>Balance</dt>
                        <dd className="mono" style={{ fontSize: 12 }}>{parseFloat(formatEther(balance.value)).toFixed(4)} {cfg.symbol}</dd>
                      </>
                    )}
                  </dl>
                </>
              ) : (
                <div className="row center">
                  <ConnectButton />
                </div>
              )}
            </div>
          </div>

          <div className="panel" style={{ padding: 'var(--s6)', marginBottom: 'var(--s5)' }}>
            <h2 className="h3" style={{ marginBottom: 'var(--s5)' }}>Network</h2>
            <dl className="kv">
              <dt>Chain</dt><dd className="mono">{cfg.isMainnet ? 'Somnia mainnet' : 'Shannon testnet'} ({cfg.chainId})</dd>
              <dt>RPC</dt><dd className="mono">{cfg.rpc.replace('https://', '')}</dd>
              <dt>Explorer</dt><dd className="mono">{cfg.explorerBase.replace('https://', '')}</dd>
            </dl>
          </div>

          <div className="panel" style={{ padding: 'var(--s6)' }}>
            <h2 className="h3" style={{ marginBottom: 'var(--s5)' }}>Contracts</h2>
            <dl className="kv">
              <dt>Lictor.sol</dt>
              <dd className="mono row gap2" style={{ fontSize: 11 }}>
                {cfg.lictor}
                <CopyBtn text={cfg.lictor} size={12} />
              </dd>
              <dt>Agents Platform</dt>
              <dd className="mono row gap2" style={{ fontSize: 11 }}>
                {cfg.platform}
                <CopyBtn text={cfg.platform} size={12} />
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  )
}
