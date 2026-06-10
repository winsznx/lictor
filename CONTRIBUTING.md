# Contributing to LICTOR

Thanks for your interest in contributing. LICTOR is a plain-English autonomous trading
desk on Somnia's Agentic L1 — contracts, an off-chain keeper, and a chain-reads-only
frontend.

## Stack (pinned — please don't drift)

- **Contracts:** Solidity 0.8.24, `viaIR: true`, optimizer runs 200
- **Build/test:** Hardhat 2.28, `@nomicfoundation/hardhat-viem`, `@nomicfoundation/hardhat-toolbox`
- **Off-chain:** TypeScript 5.x, **viem 2.x** for all RPC (no ethers.js)
- **Frontend:** Vite 5 + React 18, wagmi 2, RainbowKit 2 — reads chain + builds txs, no backend
- **Networks:** Somnia mainnet (5031), Shannon testnet (50312)

## Getting started

```bash
git clone https://github.com/winsznx/lictor.git
cd lictor
pnpm install
cp .env.example .env          # set PRIVATE_KEY (no 0x); never commit it
pnpm hardhat compile
pnpm hardhat test             # contract suite must pass

cd frontend && pnpm install && pnpm dev
```

## Ground rules

- **Branch** from `main`; keep PRs small and focused (one logical change).
- **No mocks, stubs, or demo data in product code** — real on-chain calls only. Mocks belong under `contracts/test/` for the suite.
- **No type-error suppression** — no `as any`, `@ts-ignore`, or `@ts-expect-error`.
- **Match the surrounding style** — naming, comment density, and idioms. See `CLAUDE.md` for project conventions.
- **Self-documenting code** — comments explain *why*, not *what*.

## Definition of done

- `pnpm hardhat test` passes (and you've added tests for new contract behavior).
- `pnpm hardhat compile` is clean.
- Frontend: `npx tsc --noEmit` clean and `pnpm build` succeeds.
- If you changed an interface/ABI, update the frontend `lib/abi.ts` and the keeper ABI to match.

## Reporting

- **Bugs / features:** open a GitHub issue.
- **Security vulnerabilities:** do **not** open a public issue — see [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).
