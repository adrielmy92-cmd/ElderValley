// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ElderValleyHouses
/// @notice ERC-721 house ownership contract for ElderValley.
/// @dev The game server trusts this contract's events/ownership, not client input.
contract ElderValleyHouses is ERC721Enumerable, IERC2981, Ownable, Pausable, ReentrancyGuard {
    struct HouseType {
        string key;
        string name;
        uint256 price;
        uint256 maxSupply;
        uint256 minted;
        bool active;
        uint8 tier; // 0=Common 1=Uncommon 2=Rare 3=Legendary
    }

    address payable public treasury;
    uint256 public nextTokenId = 1;
    uint256 public nextHouseTypeId = 1;

    string private _baseTokenURI;
    uint256 public royaltyBps = 500; // 5% default royalty on secondary sales

    mapping(uint256 => HouseType) public houseTypes;
    mapping(bytes32 => uint256) public houseTypeIdByKeyHash;
    mapping(uint256 => uint256) public tokenHouseTypeId;

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event BaseURIUpdated(string newBaseURI);
    event RoyaltyUpdated(uint256 newBps);
    event HouseTypeCreated(
        uint256 indexed houseTypeId,
        string key,
        string name,
        uint256 price,
        uint256 maxSupply,
        bool active
    );
    event HouseTypeUpdated(
        uint256 indexed houseTypeId,
        string key,
        string name,
        uint256 price,
        uint256 maxSupply,
        bool active
    );
    event HousePurchased(
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 indexed houseTypeId,
        string key,
        string name,
        uint256 price
    );

    constructor(address payable initialTreasury)
        ERC721("ElderValley Houses", "EVHOUSE")
        Ownable(msg.sender)
    {
        require(initialTreasury != address(0), "Invalid treasury");
        treasury = initialTreasury;

        // Genesis Collection — 50 houses total
        // Common (tier 0, weight 1x, 4 visitors) — 25 units
        _createHouseType("creative-house-cottage",        "Tall House",      0.025 ether, 7, true, 0);
        _createHouseType("creative-house-thatch-cottage", "Thatch Cottage",  0.025 ether, 6, true, 0);
        _createHouseType("creative-house-red-lodge",      "Red Lodge",       0.025 ether, 6, true, 0);
        _createHouseType("creative-house-green-cottage",  "Green House",     0.025 ether, 6, true, 0);
        // Uncommon (tier 1, weight 2x, 8 visitors) — 12 units
        _createHouseType("creative-house-blue-cottage",   "Blue House",      0.050 ether, 4, true, 1);
        _createHouseType("creative-house-ivy-manor",      "Emerald Manor",   0.050 ether, 4, true, 1);
        _createHouseType("creative-house-elf-green-manor","Elven Manor",     0.050 ether, 4, true, 1);
        // Rare (tier 2, weight 4x, 16 visitors) — 8 units
        _createHouseType("creative-house-blue-arcane-manor", "Arcane Manor", 0.100 ether, 3, true, 2);
        _createHouseType("creative-house-blue-gold-tower",   "Golden Tower", 0.100 ether, 3, true, 2);
        _createHouseType("creative-house-teal-roof-manor",   "Teal Manor",   0.100 ether, 2, true, 2);
        // Legendary (tier 3, weight 8x, unlimited visitors) — 5 units
        _createHouseType("creative-house-manor",             "Grand Manor",  0.200 ether, 3, true, 3);
        _createHouseType("creative-house-red-tower-cottage", "Red Tower",    0.200 ether, 2, true, 3);
    }

    // -------------------------------------------------------------------------
    // Purchase
    // -------------------------------------------------------------------------

    function buyHouse(uint256 houseTypeId)
        external payable nonReentrant whenNotPaused returns (uint256 tokenId)
    {
        return _executeBuy(houseTypeId);
    }

    function buyHouseByKey(string calldata key)
        external payable nonReentrant whenNotPaused returns (uint256 tokenId)
    {
        return _executeBuy(houseTypeIdByKeyHash[keccak256(bytes(key))]);
    }

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    function walletOfOwner(address ownerAddress) external view returns (uint256[] memory tokenIds) {
        uint256 count = balanceOf(ownerAddress);
        tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i += 1) {
            tokenIds[i] = tokenOfOwnerByIndex(ownerAddress, i);
        }
    }

    function houseTypeForToken(uint256 tokenId) external view returns (HouseType memory) {
        require(_ownerOf(tokenId) != address(0), "Unknown token");
        return houseTypes[tokenHouseTypeId[tokenId]];
    }

    /// @notice Fee weight for token yield distribution. Common=1 Uncommon=2 Rare=4 Legendary=8.
    function feeWeightOf(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Unknown token");
        return uint256(1) << houseTypes[tokenHouseTypeId[tokenId]].tier;
    }

    /// @notice Fee weight for a house type.
    function feeWeightOfType(uint256 houseTypeId) external view returns (uint256) {
        require(bytes(houseTypes[houseTypeId].key).length != 0, "Unknown type");
        return uint256(1) << houseTypes[houseTypeId].tier;
    }

    // -------------------------------------------------------------------------
    // Metadata — ERC-721 tokenURI
    // -------------------------------------------------------------------------

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @notice Set base URI for token metadata. tokenURI(1) → baseURI + "1"
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    // -------------------------------------------------------------------------
    // Royalties — EIP-2981
    // -------------------------------------------------------------------------

    /// @notice Returns royalty info for secondary sales. Default 5%.
    function royaltyInfo(uint256, uint256 salePrice)
        external view override returns (address receiver, uint256 royaltyAmount)
    {
        return (treasury, (salePrice * royaltyBps) / 10_000);
    }

    function setRoyaltyBps(uint256 newBps) external onlyOwner {
        require(newBps <= 1000, "Royalty too high");
        royaltyBps = newBps;
        emit RoyaltyUpdated(newBps);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721Enumerable, IERC165) returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    // -------------------------------------------------------------------------
    // Owner admin
    // -------------------------------------------------------------------------

    function createHouseType(
        string calldata key,
        string calldata displayName,
        uint256 price,
        uint256 maxSupply,
        bool active,
        uint8 tier
    ) external onlyOwner returns (uint256 houseTypeId) {
        require(tier <= 3, "Invalid tier");
        return _createHouseType(key, displayName, price, maxSupply, active, tier);
    }

    function updateHouseType(
        uint256 houseTypeId,
        string calldata key,
        string calldata displayName,
        uint256 price,
        uint256 maxSupply,
        bool active,
        uint8 tier
    ) external onlyOwner {
        require(tier <= 3, "Invalid tier");
        HouseType storage houseType = houseTypes[houseTypeId];
        require(bytes(houseType.key).length != 0, "Unknown house type");
        require(maxSupply == 0 || maxSupply >= houseType.minted, "Max below minted");
        // Tier is immutable after first mint to protect existing holders.
        if (houseType.minted > 0) require(tier == houseType.tier, "Tier immutable after mint");

        bytes32 oldKeyHash = keccak256(bytes(houseType.key));
        bytes32 newKeyHash = keccak256(bytes(key));
        if (oldKeyHash != newKeyHash) {
            require(houseTypeIdByKeyHash[newKeyHash] == 0, "Key already exists");
            delete houseTypeIdByKeyHash[oldKeyHash];
            houseTypeIdByKeyHash[newKeyHash] = houseTypeId;
        }

        houseType.key = key;
        houseType.name = displayName;
        houseType.price = price;
        houseType.maxSupply = maxSupply;
        houseType.active = active;
        houseType.tier = tier;

        emit HouseTypeUpdated(houseTypeId, key, displayName, price, maxSupply, active);
    }

    function setTreasury(address payable newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @notice Drain any residual ETH (e.g. from selfdestruct) to treasury.
    function drainETH() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to drain");
        (bool ok, ) = treasury.call{value: balance}("");
        require(ok, "Transfer failed");
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _executeBuy(uint256 houseTypeId) internal returns (uint256 tokenId) {
        HouseType storage houseType = houseTypes[houseTypeId];
        require(bytes(houseType.key).length != 0, "Unknown house type");
        require(houseType.active, "House type inactive");
        require(msg.value == houseType.price, "Incorrect ETH amount");
        require(houseType.maxSupply == 0 || houseType.minted < houseType.maxSupply, "Sold out");

        tokenId = nextTokenId++;
        houseType.minted += 1;
        tokenHouseTypeId[tokenId] = houseTypeId;

        // Forward ETH immediately to treasury — contract never holds funds.
        (bool ok, ) = treasury.call{value: msg.value}("");
        require(ok, "Treasury transfer failed");

        _safeMint(msg.sender, tokenId);

        emit HousePurchased(msg.sender, tokenId, houseTypeId, houseType.key, houseType.name, msg.value);
    }

    function _createHouseType(
        string memory key,
        string memory displayName,
        uint256 price,
        uint256 maxSupply,
        bool active,
        uint8 tier
    ) internal returns (uint256 houseTypeId) {
        require(bytes(key).length != 0, "Empty key");
        require(bytes(displayName).length != 0, "Empty name");
        require(price > 0, "Price must be positive");

        bytes32 keyHash = keccak256(bytes(key));
        require(houseTypeIdByKeyHash[keyHash] == 0, "Key already exists");

        houseTypeId = nextHouseTypeId++;
        houseTypes[houseTypeId] = HouseType({
            key: key,
            name: displayName,
            price: price,
            maxSupply: maxSupply,
            minted: 0,
            active: active,
            tier: tier
        });
        houseTypeIdByKeyHash[keyHash] = houseTypeId;

        emit HouseTypeCreated(houseTypeId, key, displayName, price, maxSupply, active);
    }
}
