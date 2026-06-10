# Security Policy

LICTOR moves real funds on-chain (token custody + autonomous DEX swaps), so we take
security seriously. Thank you for helping keep it safe.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately through one of:

- **GitHub Security Advisories** — [open a private report](https://github.com/winsznx/lictor/security/advisories/new) (preferred)
- **X / Twitter DM** — [@winsznx](https://x.com/winsznx)

We aim to acknowledge within 72 hours and to coordinate a fix and disclosure timeline
with you. Please include: affected file/function, a description, and a proof-of-concept
or reproduction if possible.

## Scope

| In scope | Notes |
|----------|-------|
| `contracts/Lictor.sol` | Deployed mandate contract (testnet + mainnet) |
| `contracts/LictorReactive.sol` | v2 keeper-less variant (not yet deployed) |
| `contracts/interfaces/*` | Agent / DEX / reactivity interfaces |
| `services/keeper/*` | Off-chain poker for `tick` / `executeIfReady` |
| `frontend/src/*` | Chain reads + transaction construction |

Out of scope: the Somnia Agents platform, Algebra/QuickSwap, RPC providers, and other
third-party infrastructure Lictor integrates with.

## Security model (what the contract guarantees)

These invariants are enforced on-chain and are the core of the threat model:

- **Callback authenticity** — every agent callback requires `msg.sender == address(PLATFORM)`.
- **Callback identity** — `requestId → mandateId + 1` mapping; unknown/duplicate callbacks are ignored (never fall through to mandate 0).
- **Permissionless ≠ privileged** — `tick` / `executeIfReady` are callable by anyone (or a keeper), but can only advance a mandate exactly as its owner defined it.
- **Token custody** — `amountIn` is pulled into the contract at `submitMandate` and refunded on `closeMandate`; the contract never holds more authority than the owner granted.
- **Per-mandate budget isolation** — each mandate spends only its own escrowed native budget; one mandate cannot drain another.
- **Execution validation** — yielded swap calldata must pass: selector allowlist (`executeSwap`), token allowlist, exact pair match, amount ceiling (`<= amountIn`), and slippage floor (`minOut >= mandate.minOut`). The LLM cannot widen slippage or redirect funds.
- **Reentrancy** — CEI throughout; status set to `EXECUTING` before any external dispatch, effects before transfers in `closeMandate`.
- **Owner controls** — `pause()` / `unpause()` halt new activity; `closeMandate` is owner-only.

A full pre-deployment audit (token-custody, budget-isolation, and callback-safety fixes)
is documented in the project's internal build log.

## Supported versions

The latest `main` and the currently deployed contract addresses (see the README
"Deployed contracts" / "Verifiable on-chain" sections) are supported.
