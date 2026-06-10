# CLAUDE.md — LICTOR

## What this is
Plain-English autonomous trading desk on Somnia's Agentic L1.
User submits trade thesis → multi-agent flow decomposes → monitors signals → executes on DEX.

## Canonical PRD
`/internal/LICTOR_Master_PRD.md` — full architecture, contracts, agent IDs, security model. Read it before any code; do not duplicate its contents elsewhere.

## Stack (pinned, do not drift)
- Solidity 0.8.24, viaIR true, optimizer runs 200
- Hardhat 2.28, @nomicfoundation/hardhat-viem 2.0.6, @nomicfoundation/hardhat-toolbox 5.0.0
- TypeScript 5.8.3, ts-node 10.9.2
- viem 2.x for ALL off-chain code (no ethers.js)
- Networks: Somnia Shannon testnet (chainId 50312), Somnia mainnet (5031)

## Verified Somnia constants
- Agents Platform (testnet):  0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
- Agents Platform (mainnet):  0x5E5205CF39E766118C01636bED000A54D93163E6
- JSON API agent ID:           13174292974160097713
- LLM Inference agent ID:      12847293847561029384
- Testnet RPC:                 https://api.infra.testnet.somnia.network
- Testnet explorer:            https://shannon-explorer.somnia.network
- Testnet receipts API:        https://receipts.testnet.agents.somnia.host?requestId=<id>

## Verified DEX + token constants (mainnet, confirmed from bytecode 2026-06-05)
- Algebra Router:              0x1582f6f3D26658F7208A799Be46e34b1f366CE44
- Algebra Deployer:            0x0361B4883FfD676BB0a4642B3139D38A33e452f5
- USDC.e:                      0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00
- WSOMI:                       0x046EDe9564A72571df6F5e44d0405360c0f4dCab
- USDC.e/WSOMI pool:           0xe5467be8b8db6b074904134e8c1a581f5565e2c3 ($296K TVL)
- exactInputSingle selector:   0x1679c792 (no pluginData field — confirmed absent in deployed struct)
- Lictor.sol (testnet):        0x8c5f99096252e506d6fcbc28147395b4092bc01f  ← v2, inferToolsChat execution

## inferToolsChat status
CONFIRMED LIVE on Shannon testnet as of 2026-06-05. Prior failures were caused by wrong interface (string vs string[], missing mcpServerUrls/maxIterations params).
Full architecture active: executeIfReady dispatches inferToolsChat → handleExecution validates and executes swap.

## Per-validator agent pricing
- JSON API:        0.03 STT/SOMI per validator
- LLM Inference:   0.07 STT/SOMI per validator
- Parse Website:   0.10 STT/SOMI per validator
- Subcommittee size default: 3
- Deposit math:    PLATFORM.getRequestDeposit() + perAgentPrice × 3

## Hard rules
1. NEVER mocks/stubs/demo data. Real on-chain calls only.
2. NEVER suggest git commits — batch-commit at end of window.
3. NEVER scope-cut. Time is logistics, not a constraint on ambition.
4. Every callback handler MUST: require(msg.sender == address(PLATFORM)).
5. Every contract MUST have: receive() external payable {} (for rebates).
6. Every handler MUST check ResponseStatus before decoding responses.
7. Whitelist allowed tool selectors before executing yielded calldata.
8. /internal is gitignored — PRD + strategic docs never ship to public repo.
9. Mermaid diagrams: never default yellow/orange fills. Use the dark/neutral theme block.
10. Update AGENT_PROGRESS.md after every cross-session-relevant finding.

## File locations
- Public docs: /README.md, /ONE_PAGER.md
- Internal: /internal/* (gitignored — PRD, build log, demo script)
- Cross-session memory: /internal/AGENT_PROGRESS.md
- Solidity: /contracts/
- Scripts: /scripts/
- Tests: /test/