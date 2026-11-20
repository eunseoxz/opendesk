# OpenDesk FAQ

Short answers for `/faq` and for judges scanning the README.

### What is OpenDesk?
An on-chain service desk on BNB Chain. Holders of a Binance Agent ID can open a small paid ticket in BNB, confirm the payment in their own wallet, and get a receipt tied to that Agent ID.

### Do I need an Agent ID?
Yes. Without an Agent ID you cannot open a ticket. The contract checks the official registry. The site will only show a claim prompt and a connect button.

### How do I claim an Agent ID?
Only inside the official Binance app: Wallet → home banner → Agent ID. Do not use random claim links. OpenDesk never asks for your seed phrase.

### How much does a ticket cost?
MVP default / minimum fee is **0.001 BNB** (you must send at least `minFee`), plus network gas. There is no maxFee in the contract. Exact gas is shown by your wallet before you confirm. Measured gas figures will be listed in the README after testnet runs (we do not invent numbers).

### Can I get a refund?
Yes, if you cancel while the ticket is still `open` (before the operator resolves it). The fee is held in the contract on open and refunded to you on cancel. After resolve, the fee is sent to the immutable treasury and is non-refundable.

### Who can resolve my ticket?
A fixed operator address set at deploy. The operator calls `resolveTicket(uint256 ticketId)`. The owner cannot freely drain ticket fees; held fees go to the immutable treasury only on resolve.

### What can the owner do?
Only `pause` and `unpause` (emergency stop for opening new tickets). Treasury and operator are fixed. The Agent ID registry address cannot be changed after deploy.

### Will OpenDesk sign transactions for me?
No. Every on-chain action needs your own wallet confirmation. We do not auto-sign, and we do not pair Agentic Wallets by QR on our site.

### Is this a bounty marketplace?
No. OpenDesk is a paid gate to a desk/operator. It is not a worker-claim escrow board.

### Which chain?
BNB Chain. We soft-launch on testnet first, then mainnet after tests are green and the team has approval for gas.

### Where is the code?
`https://github.com/eunseoxz/opendesk` - Solidity 0.8.x, Foundry tests, source verified on BscScan after deploy.
