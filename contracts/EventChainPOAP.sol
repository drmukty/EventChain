// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventChainPOAP is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event AttendanceMinted(address indexed attendee, uint256 indexed tokenId, string uri);

    constructor() ERC721("Block Pass POAP", "BPOAP") Ownable(msg.sender) {}

    function safeMint(address to, string memory uri) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit AttendanceMinted(to, tokenId, uri);
    }
}
