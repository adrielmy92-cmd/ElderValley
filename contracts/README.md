# ElderValley Smart Contracts

Initial Web3 contract layer for ElderValley on Base/Ethereum.

## Contracts

- `ElderValleyHouses.sol`
  - ERC-721 house NFTs.
  - Buying a house mints an NFT to the buyer wallet.
  - Emits `HousePurchased`, which the game server should listen to before granting access.
  - Holds ETH until the owner calls `withdraw()` to send funds to the treasury wallet.

- `ElderValleyHouseMarketplace.sol`
  - Optional secondary market for house NFTs.
  - Players list houses, buyers pay ETH, the contract transfers the NFT and pays the seller.
  - Includes a configurable project fee.

## Initial House Prices

| House | Key | Price |
| --- | --- | --- |
| Turquoise Manor | `creative-house-teal-roof-manor` | 0.30 ETH |
| Blue Tower Manor | `creative-house-blue-gold-tower` | 0.30 ETH |
| Tower House | `creative-house-red-tower-cottage` | 0.20 ETH |
| Blue House | `creative-house-blue-cottage` | 0.20 ETH |
| Thatch Cottage | `creative-house-thatch-cottage` | 0.20 ETH |
| Emerald Manor | `creative-house-ivy-manor` | 0.30 ETH |
| Green House | `creative-house-green-cottage` | 0.15 ETH |
| Red Lodge | `creative-house-red-lodge` | 0.30 ETH |

## Server Rule

The game server should not unlock a house because the frontend button was clicked.
It should unlock only after confirming one of these:

1. The wallet owns a matching house NFT on-chain.
2. The server received and verified a `HousePurchased` event.

## Server Indexer

The Node server now has a Base house indexer. Set these Railway variables after
deploying `ElderValleyHouses`:

```txt
ELDERVALLEY_BASE_RPC_URL=https://mainnet.base.org
ELDERVALLEY_CHAIN_ID=8453
ELDERVALLEY_HOUSES_CONTRACT=0x_contract_address_after_deploy
ELDERVALLEY_HOUSE_INDEXER_START_BLOCK=deployment_block_number
```

The server stores ownership in Postgres table `web3_house_ownership` and keeps
progress in `web3_indexer_state`. Public read endpoints:

- `/api/web3/config`
- `/api/web3/indexer/status`
- `/api/web3/houses/0x_wallet`

## Next Steps

1. Run `npm run contracts:compile`.
2. Run `npm run contracts:test`.
3. Run `npm run contracts:slither`.
4. Deploy to Base with `npm run contracts:deploy:base`.
5. Check `deployments/base.json` for the saved contract addresses and deployment block.
6. Verify later with `npm run contracts:verify:base` if `VERIFY_CONTRACTS=true` was not used during deploy.
7. Connect the game's `Buy` button to `buyHouseByKey(key)`.
8. Add the contract address and deployment block to Railway variables.

## Base Deploy

Create a local `.env` based on `.env.example` and fill these values manually:

```txt
BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=never_commit_this_value
TREASURY_ADDRESS=0x_wallet_that_receives_house_sales
BASESCAN_API_KEY=optional_for_verification
VERIFY_CONTRACTS=false
```

Then run:

```bash
npm run contracts:deploy:base
```

The deployer writes `deployments/base.json` with constructor arguments, contract
addresses, and `ELDERVALLEY_HOUSE_INDEXER_START_BLOCK`. Use that block in Railway
so the server indexer starts from the first house event and does not miss sales.

To verify contracts after deploy:

```bash
npm run contracts:verify:base
```

## Security Notes

Latest Slither pass reduced the findings to expected warnings:

- OpenZeppelin uses `^0.8.20` while ElderValley contracts use `^0.8.24`.
- ETH payments use `.call`, protected by `nonReentrant` and explicit success checks.

Use `npm run contracts:slither:raw` to see the full report including accepted
warnings. Use `npm run contracts:slither` for the clean pre-deploy check.

Before putting meaningful money through the contracts, run the full checklist again
and do a focused external review.
