# OpenDesk

**One-line pitch:** OpenDesk is an on-chain service desk on BNB Chain. Only wallets that hold a Binance Agent ID can open a small paid ticket in BNB, confirm the payment themselves in their wallet, and get a receipt tied to that Agent ID.

## Why Agent ID is required (not optional)

- **Access gate.** `openTicket` reverts if `balanceOf(Agent ID registry, msg.sender) == 0`. No Agent ID means no ticket and no pay button.
- **Payment identity.** Ticket events store the agent address. Receipts on the UI are built from on-chain events (plus token URI/name when available), not from a free-text form.
- **Light anti-sybil.** Agent ID is non-transferable (one per user). Farming volume without a real Agent ID does not count toward the unique-interaction metric.
- **Not a sticker.** The UI without an Agent ID only shows "Claim an Agent ID first" and a connect button. Every paid action goes through the contract that checks the registry.

Agent ID registry (SPACE ID Agent ID NFT, non-transferable): `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`

## How to claim an official Agent ID

Claim only inside the official Binance app. Do not use random links.

1. Open the Binance app.
2. Go to **Wallet**.
3. Open the home banner for **Agent ID**.
4. Follow the in-app claim flow until your wallet holds one Agent ID NFT.

OpenDesk never asks for a seed phrase, never pairs an Agentic Wallet by QR on our site, and never signs transactions for you.

## User flow

1. Open the OpenDesk site and connect a wallet (MetaMask, Binance Web3 Wallet, or another EIP-1193 provider). We do not store Agentic Wallet sessions on a server.
2. The site calls `balanceOf(registry, yourAddress)`.
   - If `0`: you see "Claim an Agent ID first" and the official Binance claim path. Pay is disabled.
   - If `> 0`: you can fill the ticket form.
3. Fill title, category, optional note, and fee (**at least minFee**; MVP default / minFee is **0.001 BNB**). There is no maxFee in the contract.
4. Click **Open ticket**. Your wallet shows a native popup for BNB value + gas. You must confirm yourself. No auto-sign.
5. After the tx is mined, the contract emits `TicketOpened`. You get a receipt: `ticketId`, agent address, fee, timestamp, status = `open`. The fee is **held in the contract** (not sent yet).
6. The fixed operator calls `resolveTicket(uint256 ticketId)`. On resolve, the held fee is sent to the immutable treasury. While status is still `open`, you can call `cancelTicket` and receive a full fee refund. After resolve, the fee is non-refundable.
7. On **My tickets**, filter by your connected address and see `open` / `resolved` / `cancelled`.

## What OpenDesk is (and is not)

| Is | Is not |
|---|---|
| A paid gate to open a small service ticket | A bounty board / worker claim marketplace |
| Receipt tied to Agent ID | Multi-party escrow for freelancers |
| Native BNB fee held until resolve or cancel | An ERC-20 approve flow or unlimited allowance |
| User-confirmed txs only | Auto-sign or server-held keys |

## Owner permissions (disclosure)

Kept minimal on purpose:

- Owner can **`pause` / `unpause`** only (emergency stop for `openTicket`).
- **`treasury` is immutable** (set once in the constructor).
- **Operator is fixed** in the constructor (resolve role). Not a free-floating "owner withdraws user funds" pattern.
- No mint, no dynamic tax, no user freeze, no changing the Agent ID registry after deploy (registry address is immutable).
- No ownership renounce required for MVP; pause exists so a fee bug can be stopped.

## Fee policy

- Default / minFee (MVP): **0.001 BNB**. Fee must be **at least minFee**. The contract has no maxFee.
- On `openTicket`, the fee is **held in the contract**.
- On `resolveTicket`, the held fee is sent to the immutable treasury.
- On `cancelTicket` (only while `open`, before resolve), the held fee is **refunded** to the opener.
- After resolve: fee is **non-refundable**.

## Contracts and stack

- Chain: BNB Chain (testnet first, then mainnet after green tests).
- Main contract: `OpenDesk.sol` (Solidity 0.8.x, Foundry tests, verified source on BscScan).
- Frontend: static site + `viem`, hosted on Cloudflare Pages. No backend that holds keys.
- Core events: `TicketOpened` (primary metric), plus `TicketResolved` / `TicketCancelled`.
- Resolve signature: `resolveTicket(uint256 ticketId)` (no result URI argument).

### Deployment

| Field | Value |
|---|---|
| Live URL | `https://opendesk-dc5.pages.dev` |
| Repo | `https://github.com/eunseoxz/opendesk` |
| Contract | `0x92D3290E4bB04E32D321d58A5bB1a77E049F2e93` · https://bscscan.com/address/0x92D3290E4bB04E32D321d58A5bB1a77E049F2e93 |
| Deploy gas (measured) | `deploy gasUsed 1,124,223 (tx 0xc30e2bfe…c0be, BSC mainnet)` |

## Safety rules we follow

- Every on-chain action needs the user's own wallet confirmation.
- No QR pairing of Agentic Wallet on our site.
- No unlimited ERC-20 approve (we take native BNB only).
- Neutral name and brand (OpenDesk). We do not imitate Binance or BNB visual identity.
- No seed phrases, no "pay gas to claim a prize" flows.
