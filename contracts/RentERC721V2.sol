// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Rentropy721.sol";

contract RentERC721V2 is Rentropy721 {

    function rentVersion() pure public returns(uint256) {
        return 2;
    }
}