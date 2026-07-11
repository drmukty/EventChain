// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title EventChainPOAP
/// @notice Soulbound-style Proof-of-Attendance NFT for EventChain.
/// @dev Deploy identically to Base Sepolia and Base Mainnet — the ONLY things
///      that change between environments are the RPC URL, chain ID, and the
///      deployed contract address (all supplied via env vars, never hardcoded).
contract EventChainPOAP is ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    Counters.Counter private _tokenIds;

    // eventId (off-chain UUID hashed) => attendee address => already minted
    mapping(bytes32 => mapping(address => bool)) public hasAttended;

    // tokenId => eventId hash, for on-chain provenance / verification
    mapping(uint256 => bytes32) public tokenEvent;

    event AttendanceMinted(
        address indexed attendee,
        uint256 indexed tokenId,
        bytes32 indexed eventIdHash,
        string tokenURI
    );

    constructor(address backendMinter) ERC721("EventChain POAP", "ECPOAP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        if (backendMinter != address(0)) {
            _grantRole(MINTER_ROLE, backendMinter);
        }
    }

    /// @notice Mint a single Proof-of-Attendance NFT to an attendee.
    /// @dev Called by the backend's minter wallet only after a verified,
    ///      single-use QR check-in has been recorded off-chain.
    /// @param attendee The attendee's wallet address.
    /// @param eventIdHash keccak256 of the off-chain event UUID (prevents leaking DB ids on-chain).
    /// @param uri Metadata URI (e.g. ipfs://... or Supabase-hosted JSON) describing the event/badge.
    function mintAttendance(
        address attendee,
        bytes32 eventIdHash,
        string calldata uri
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(attendee != address(0), "EventChainPOAP: zero address");
        require(!hasAttended[eventIdHash][attendee], "EventChainPOAP: already minted for this event");

        hasAttended[eventIdHash][attendee] = true;

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(attendee, newTokenId);
        _setTokenURI(newTokenId, uri);
        tokenEvent[newTokenId] = eventIdHash;

        emit AttendanceMinted(attendee, newTokenId, eventIdHash, uri);
        return newTokenId;
    }

    /// @notice Soulbound behavior: POAPs are non-transferable proof of attendance.
    ///         Minting and burning remain possible; only wallet-to-wallet transfers are blocked.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("EventChainPOAP: attendance badges are non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
