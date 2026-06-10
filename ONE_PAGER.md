# LICTOR — One-Pager

**State a thesis. Agents execute.**
*Plain-English autonomous trading on Somnia's Agentic L1.*

---

## The problem

Three things stand between a trader and an executed strategy: signals, decisions, execution. Today, each one lives in a different system — off-chain data feeds, off-chain bots, on-chain DEXes — wired together by trust assumptions. The "trustless contract" is leashed to a trusted middleman at every step.

Retail traders can't run quant strategies at all. They watch markets with their eyes. By the time they act, the edge is gone.

---

## The product

Lictor is a smart contract that lets a trader state a trade thesis in plain English — for example *"Buy SOMI if Bitcoin > $100k odds drop below 70% on Polymarket and ETH is above $4,000"* — and have a chain of on-chain agents decompose the thesis into measurable signals, monitor them continuously, decide when conditions fire, and execute the swap.

No human intervention after the mandate is set. Every step has a consensus receipt.

---

## Four stages, all on-chain

| | |
|---|---|
| **1 — SUBMIT** | Trader posts the thesis + tokens + budget. One transaction. |
| **2 — DECOMPOSE** | Somnia's LLM Agent parses the thesis into structured `Signal[]` and stores it. |
| **3 — MONITOR** | JSON API and Parse Website agents fetch live values; the threshold check happens on-chain. |
| **4 — EXECUTE** | LLM Agent yields swap calldata via `inferToolsChat`; contract validates and calls the DEX. |

---

## Why only on Somnia

Other "agentic" chains run inference off-chain with attestations — the AI step is still a trusted black box. Somnia runs LLM inference directly on its validator set with `temperature=0` and fixed seeds, so every node reaches consensus on the exact bytes the model produces. Combined with `inferToolsChat` (the model yielding ABI-encoded calldata back to the calling contract), the entire decision pipeline lives in the consensus layer.

No other live L1 lets you ship this.

---

## Comp landscape

|             | Plain-English mandate | On-chain decision | Composable signal sources |
|-------------|:--------------------:|:-----------------:|:-------------------------:|
| Hyperliquid | —                    | —                 | —                         |
| Polymarket  | —                    | —                 | n/a                       |
| 3Commas     | —                    | — (cloud)         | Yes                       |
| **Lictor**  | **Yes**              | **Yes**           | **Yes**                   |

---

## What's live

- **A full autonomous swap executed on Somnia mainnet** — thesis *"Buy WSOMI if BTC falls below $70k"* decomposed, monitored, and settled on the Algebra DEX with zero human intervention ([MandateExecuted, 0.4862 WSOMI](https://explorer.somnia.network/tx/0x9dc009e095c3a637d7e8450e234106ed360d83bf9806776828f59c0ea9c0a416))
- Lictor core deployed on **mainnet** (`0xf02c982d19184c11b86bc34672441c45fbf0f93e`) and testnet
- Full pipeline on-chain: LLM `inferString` decompose → JSON API monitor → LLM `inferToolsChat` → DEX swap, each with a validator-consensus receipt at `agents.somnia.network`
- Dual-chain frontend (live on Railway) + autonomous keeper service

---

## Built by

Tim — [@winsznx](https://x.com/winsznx).

Independent. Solo.