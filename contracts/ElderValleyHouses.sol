// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ElderValleyHouses
/// @notice ERC-721 house ownership contract for ElderValley.
/// @dev The game server should trust this contract's events/ownership, not client clicks.
contract ElderValleyHouses is ERC721Enumerable, Ownable, Pausable, ReentrancyGuard {
    struct HouseType {
        string key;
        string name;
        uint256 price;
        uint256 maxSupply;
        uint256 minted;
        bool active;
    }

    address payable public treasury;
    uint256 public nextTokenId = 1;
    uint256 public nextHouseTypeId = 1;

    mapping(uint256 => HouseType) public houseTypes;
    mapping(bytes32 => uint256) public houseTypeIdByKeyHash;
    mapping(uint256 => uint256) public tokenHouseTypeId;

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
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

        _createHouseType("creative-house-teal-roof-manor", "Turquoise Manor", 0.30 ether, 0, true);
        _createHouseType("creative-house-blue-gold-tower", "Blue Tower Manor", 0.30 ether, 0, true);
        _createHouseType("creative-house-red-tower-cottage", "Tower House", 0.20 ether, 0, true);
        _createHouseType("creative-house-blue-cottage", "Blue House", 0.20 ether, 0, true);
        _createHouseType("creative-house-thatch-cottage", "Thatch Cottage", 0.20 ether, 0, true);
        _createHouseType("creative-house-ivy-manor", "Emerald Manor", 0.30 ether, 0, true);
        _createHouseType("creative-house-green-cottage", "Green House", 0.15 ether, 0, true);
        _createHouseType("creative-house-red-lodge", "Red Lodge", 0.30 ether, 0, true);
    }

    function buyHouse(uint256 houseTypeId) external payable nonReentrant whenNotPaused returns (uint256 tokenId) {
        HouseType storage houseType = houseTypes[houseTypeId];
        require(bytes(houseType.key).length != 0, "Unknown house type");
        require(houseType.active, "House type inactive");
        require(msg.value == houseType.price, "Incorrect ETH amount");
        require(houseType.maxSupply == 0 || houseType.minted < houseType.maxSupply, "Sold out");

        tokenId = nextTokenId++;
        houseType.minted += 1;
        tokenHouseTypeId[tokenId] = houseTypeId;

        _safeMint(msg.sender, tokenId);

        emit HousePurchased(
            msg.sender,
            tokenId,
            houseTypeId,
            houseType.key,
            houseType.name,
            msg.value
        );
    }

    function buyHouseByKey(string calldata key) external payable nonReentrant whenNotPaused returns (uint256 tokenId) {
        uint256 houseTypeId = houseTypeIdByKeyHash[keccak256(bytes(key))];
        HouseType storage houseType = houseTypes[houseTypeId];
        require(bytes(houseType.key).length != 0, "Unknown house type");
        require(houseType.active, "House type inactive");
        require(msg.value == houseType.price, "Incorrect ETH amount");
        require(houseType.maxSupply == 0 || houseType.minted < houseType.maxSupply, "Sold out");

        tokenId = nextTokenId++;
        houseType.minted += 1;
        tokenHouseTypeId[tokenId] = houseTypeId;

        _safeMint(msg.sender, tokenId);

        emit HousePurchased(
            msg.sender,
            tokenId,
            houseTypeId,
            houseType.key,
            houseType.name,
            msg.value
        );
    }

    function walletOfOwner(address ownerAddress) external view returns (uint256[] memory tokenIds) {
        uint256 count = balanceOf(ownerAddress);
        tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i += 1) {
            tokenIds[i] = tokenOfOwnerByIndex(ownerAddress, i);
        }
    }

    function houseTypeForToken(uint256 tokenId) external view returns (HouseType memory houseType) {
        require(_ownerOf(tokenId) != address(0), "Unknown token");
        return houseTypes[tokenHouseTypeId[tokenId]];
    }

    function createHouseType(
        string calldata key,
        string calldata displayName,
        uint256 price,
        uint256 maxSupply,
        bool active
    ) external onlyOwner returns (uint256 houseTypeId) {
        return _createHouseType(key, displayName, price, maxSupply, active);
    }

    function updateHouseType(
        uint256 houseTypeId,
        string calldata key,
        string calldata displayName,
        uint256 price,
        uint256 maxSupply,
        bool active
    ) external onlyOwner {
        HouseType storage houseType = houseTypes[houseTypeId];
        require(bytes(houseType.key).length != 0, "Unknown house type");
        require(maxSupply == 0 || maxSupply >= houseType.minted, "Max below minted");

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

        emit HouseTypeUpdated(houseTypeId, key, displayName, price, maxSupply, active);
    }

    function setTreasury(address payable newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool ok, ) = treasury.call{value: balance}("");
        require(ok, "Withdraw failed");
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _createHouseType(
        string memory key,
        string memory displayName,
        uint256 price,
        uint256 maxSupply,
        bool active
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
            active: active
        });
        houseTypeIdByKeyHash[keyHash] = houseTypeId;

        emit HouseTypeCreated(houseTypeId, key, displayName, price, maxSupply, active);
    }
}
