# OpenDesk web (wired preview)

Static hash SPA copied from `../design/site/` and wired to viem + `OpenDesk.abi.json`.
Do not edit `../design/` here; change copies under `web/` only.

## Serve a local preview

```bash
cd /workspace/hackathons/binance-agent-id/web
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`.

- Live (default): Connect wallet talks to BSC mainnet (chainId 56) via `config.js`.
  `openDesk` is `null` until deploy, so Agent ID can be checked on the registry but open/cancel stay disabled.
- Offline demo: `http://127.0.0.1:8765/?demo=ready` (also `disconnected`, `noagent`, `loading`, `empty`, `error`).

Routes: `#/` `#/desk` `#/tickets` `#/ticket/:id` `#/faq`.

Form fields: `title`, `category` (string label), `note`, `fee` >= 0.001 BNB. Every write waits for a wallet confirm.

The earlier testnet harness is in `legacy-harness/`.
