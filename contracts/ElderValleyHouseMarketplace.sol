// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ElderValleyHouseMarketplace
/// @notice Basic marketplace for ElderValley house NFTs.
contract ElderValleyHouseMarketplace is IERC721Receiver, Ownable, Pausable, ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
    }

    IERC721 public immutable houseNft;
    address payable public treasury;
    uint256 public feeBps;

    mapping(uint256 => Listing) public listings;

    event Listed(address indexed seller, uint256 indexed tokenId, uint256 price);
    event ListingCancelled(address indexed seller, uint256 indexed tokenId);
    event Purchased(
        address indexed buyer,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 price,
        uint256 fee
    );
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    constructor(address houseNftAddress, address payable initialTreasury, uint256 initialFeeBps)
        Ownable(msg.sender)
    {
        require(houseNftAddress != address(0), "Invalid NFT");
        require(initialTreasury != address(0), "Invalid treasury");
        require(initialFeeBps <= 1000, "Fee too high");

        houseNft = IERC721(houseNftAddress);
        treasury = initialTreasury;
        feeBps = initialFeeBps;
    }

    function list(uint256 tokenId, uint256 price) external whenNotPaused nonReentrant {
        require(price > 0, "Price must be positive");
        require(houseNft.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(listings[tokenId].seller == address(0), "Already listed");

        listings[tokenId] = Listing({ seller: msg.sender, price: price });
        houseNft.safeTransferFrom(msg.sender, address(this), tokenId);

        emit Listed(msg.sender, tokenId, price);
    }

    function cancel(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller == msg.sender || msg.sender == owner(), "Not allowed");
        require(listing.seller != address(0), "Not listed");

        delete listings[tokenId];
        houseNft.safeTransferFrom(address(this), listing.seller, tokenId);

        emit ListingCancelled(listing.seller, tokenId);
    }

    function buy(uint256 tokenId) external payable whenNotPaused nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "Not listed");
        require(msg.value == listing.price, "Incorrect ETH amount");

        delete listings[tokenId];

        uint256 fee = (msg.value * feeBps) / 10_000;
        uint256 sellerAmount = msg.value - fee;

        if (fee > 0) {
            (bool feeOk, ) = treasury.call{value: fee}("");
            require(feeOk, "Fee transfer failed");
        }

        (bool sellerOk, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(sellerOk, "Seller transfer failed");

        houseNft.safeTransferFrom(address(this), msg.sender, tokenId);

        emit Purchased(msg.sender, listing.seller, tokenId, msg.value, fee);
    }

    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high");
        uint256 oldFeeBps = feeBps;
        feeBps = newFeeBps;
        emit FeeUpdated(oldFeeBps, newFeeBps);
    }

    function setTreasury(address payable newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external view override returns (bytes4) {
        // Rejeita NFTs de contratos não autorizados para evitar que fiquem presos aqui.
        require(msg.sender == address(houseNft), "Unauthorized NFT contract");
        return IERC721Receiver.onERC721Received.selector;
    }
}
