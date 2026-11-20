# Binance submit form: how OpenDesk uses Agent ID

Paste-ready English for the Agent ID usage / project description fields. Keep the short block if the form is tight; use the long block if there is room.

## Short (about 700 characters)

OpenDesk is an on-chain service desk on BNB Chain. Agent ID is the access key, not a badge. `openTicket` requires `balanceOf(Agent ID registry, msg.sender) > 0`. Without an Agent ID the UI only shows “claim Agent ID first” and disables pay. When a holder opens a ticket, they confirm a small native BNB fee (at least minFee; MVP default 0.001 BNB) in their own wallet. The fee is held in the contract until resolve (sent to the immutable treasury) or cancel (refunded). The contract emits `TicketOpened` with the agent address, so the receipt is tied to that Agent ID. Owner powers are limited to pause/unpause; treasury and operator are fixed at deploy. Registry: `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`.

## Long (project description)

**Project name:** OpenDesk

**One sentence:** Only Agent ID holders can open a small paid service ticket on BNB Chain, confirm payment themselves, and receive a receipt bound to their Agent ID.

**Problem.** Small on-chain services (quick reviews, technical checks, short consults, file delivery) are often open to anyone. Without a stable identity it is hard to separate serious users from spam, and receipts are not bound to a verifiable ID.

**How Agent ID sits at the core.**

1. **Gate.** The contract calls the official SPACE ID Agent ID registry and requires `balanceOf(user) > 0` before `openTicket`. No Agent ID, no ticket.
2. **Identity on the receipt.** `TicketOpened` stores the agent address (the `msg.sender` that holds the NFT). The frontend builds the receipt from events, not from a free-text name field.
3. **Anti-sybil for judging.** Agent ID is non-transferable (one per user). Interactions without a real Agent ID do not count toward unique Agent ID metrics.
4. **UI honesty.** If the connected wallet has no Agent ID, OpenDesk shows the official Binance claim path and hides the pay action. Agent ID is not a footer sticker.

**User path.** Connect wallet → check Agent ID → fill ticket (title, category, optional note, fee at least minFee) → confirm BNB + gas in the native wallet popup → see receipt and status (`open` / `resolved` / `cancelled`). The fee is held in the contract on open. Cancel refunds the fee while the ticket is still open; on resolve the fee goes to the immutable treasury via `resolveTicket(uint256 ticketId)`.

**Why this is not a generic bounty board.** OpenDesk is a paid gate to a desk/operator, not a marketplace where posters lock escrow for workers to claim. There is no multi-party worker claim flow in the MVP.

**Owner disclosure.** Owner can pause/unpause `openTicket` only. Treasury address is immutable. Operator (resolve) is fixed in the constructor. Registry address is immutable. No mint, no dynamic tax, no user freeze.

**Registry address:** `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`

**Links (fill before submit):**

- Live dApp: `https://opendesk-dc5.pages.dev`
- Repo (verified source): `https://github.com/eunseoxz/opendesk`
- BscScan contract: `https://bscscan.com/address/0x92D3290E4bB04E32D321d58A5bB1a77E049F2e93#code`
