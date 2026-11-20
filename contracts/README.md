# OpenDesk contracts

Paid service desk on BNB Chain. Only addresses with Agent ID (`registry.balanceOf > 0`) can open a ticket.

## Layout

- `src/OpenDesk.sol` main contract
- `src/interfaces/IAgentIdRegistry.sol` balanceOf surface (inject real registry on mainnet)
- `src/mocks/MockAgentIdRegistry.sol` test and testnet stand-in
- `test/OpenDesk.t.sol` Foundry tests

## Owner powers

- `pause` / `unpause` only (blocks new `openTicket`)
- `treasury` immutable
- `operator` fixed in constructor
- Registry address immutable (constructor inject)

## Fee policy

- `minFee` default 0.001 BNB (1e15 wei)
- On `openTicket`, fee is held in the contract
- `cancelTicket` (opener, status open): refund fee
- `resolveTicket` (operator): forward fee to treasury; after this, non-refundable

Holding until resolve/cancel is required so cancel+refund works without pulling from treasury.

## Commands

```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge test
forge build
```

ABI export for frontend: `../deploy/OpenDesk.abi.json`

## Mainnet note

Do not hardcode the Agent ID registry as the only option. Pass `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID Agent ID) via constructor when deploying mainnet. Testnet uses MockAgentIdRegistry.

No Binance or BNB branding in contract names.

## Mainnet (not broadcast yet)

See `../deploy/MAINNET.md`. Script: `script/DeployMainnet.s.sol` (chainId 56, live registry, no mock).
Fork tests: `forge test --match-path test/OpenDeskMainnetFork.t.sol --fork-url <BSC or local anvil fork>`.
