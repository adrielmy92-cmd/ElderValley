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

## Next Steps

1. Run `npm run contracts:compile`.
2. Run `npm run contracts:test`.
3. Run `npm run contracts:slither`.
4. Deploy to Base with `npm run contracts:deploy:base`.
5. Connect the game's `Buy` button to `buyHouseByKey(key)`.
6. Add a server indexer that watches `HousePurchased` and updates Postgres.

## Security Notes

Latest Slither pass reduced the findings to expected warnings:

- OpenZeppelin uses `^0.8.20` while ElderValley contracts use `^0.8.24`.
- ETH payments use `.call`, protected by `nonReentrant` and explicit success checks.

Use `npm run contracts:slither:raw` to see the full report including accepted
warnings. Use `npm run contracts:slither` for the clean pre-deploy check.

Before putting meaningful money through the contracts, run the full checklist again
and do a focused external review.
