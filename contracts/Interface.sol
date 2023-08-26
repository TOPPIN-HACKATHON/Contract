// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/// @dev the ERC-165 identifier for this interface is `0x6faff5f1`
interface IERC6551Account {
    /**
     * @dev Allows the account to receive Ether
     *
     * Accounts MUST implement a `receive` function.
     *
     * Accounts MAY perform arbitrary logic to restrict conditions
     * under which Ether can be received.
     */
    receive() external payable;

    /**
     * @dev Returns the identifier of the non-fungible token which owns the account
     *
     * The return value of this function MUST be constant - it MUST NOT change
     * over time
     *
     * @return chainId       The EIP-155 ID of the chain the token exists on
     * @return tokenContract The contract address of the token
     * @return tokenId       The ID of the token
     */
    function token()
        external
        view
        returns (uint256 chainId, address tokenContract, uint256 tokenId);

    /**
     * @dev Returns a value that SHOULD be modified each time the account changes state
     *
     * @return The current account state
     */
    function state() external view returns (uint256);

    /**
     * @dev Returns a magic value indicating whether a given signer is authorized to act on behalf of the account
     *
     * MUST return the bytes4 magic value 0x523e3260 if the given signer is valid
     *
     * By default, the holder of the non-fungible token the account is bound to MUST be considered a valid
     * signer
     *
     * Accounts MAY implement additional authorization logic which invalidates the holder as a
     * signer or grants signing permissions to other non-holder accounts
     *
     * @param  signer     The address to check signing authorization for
     * @param  context    Additional data used to determine whether the signer is valid
     * @return magicValue Magic value indicating whether the signer is valid
     */
    function isValidSigner(
        address signer,
        bytes calldata context
    ) external view returns (bytes4 magicValue);

    function owner() external view returns (address);

    function rental(address renterAddress, uint256 duration) external;
}

/// @dev the ERC-165 identifier for this interface is `0x74420f4c`
interface IERC6551Executable {
    /**
     * @dev Executes a low-level operation if the caller is a valid signer on the account
     *
     * Reverts and bubbles up error if operation fails
     *
     * @param to        The target address of the operation
     * @param value     The Ether value to be sent to the target
     * @param data      The encoded operation calldata
     * @param operation A value indicating the type of operation to perform
     *
     * Accounts implementing this interface MUST accept the following operation parameter values:
     * - 0 = CALL
     * - 1 = DELEGATECALL
     * - 2 = CREATE
     * - 3 = CREATE2
     *
     * Accounts implementing this interface MAY support additional operations or restrict a signer's
     * ability to execute certain operations
     *
     * @return The result of the operation
     */
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint256 operation
    ) external payable returns (bytes memory);
}

interface IERC6551Registry {
    /**
     * @dev The registry SHALL emit the AccountCreated event upon successful account creation
     */
    event AccountCreated(
        address account,
        address indexed implementation,
        uint256 chainId,
        address indexed tokenContract,
        uint256 indexed tokenId,
        uint256 salt
    );

    /**
     * @dev Creates a token bound account for a non-fungible token.
     *
     * If account has already been created, returns the account address without calling create2.
     *
     * If initData is not empty and account has not yet been created, calls account with
     * provided initData after creation.
     *
     * Emits AccountCreated event.
     *
     * @return the address of the account
     */
    function createAccount(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 seed,
        bytes calldata initData
    ) external returns (address);

    /**
     * @dev Returns the computed token bound account address for a non-fungible token
     *
     * @return The computed address of the token bound account
     */
    function account(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        uint256 salt
    ) external view returns (address);
}
