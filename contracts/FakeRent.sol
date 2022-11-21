// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
interface Ecosystem {
    function addContribution(address, uint256) external;
}

contract FakeRent is OwnableUpgradeable {
    Ecosystem ecosystem;
    uint256 ecoList;
    uint256 ecoRent;
    uint256 ecoKick;

    address lister;


    function setEcosystem (Ecosystem _eco) external onlyOwner {
        ecosystem = _eco;
    }

    function setEcoRward(uint256 _ecoList, uint256 _ecoRent, uint256 _ecoKick) external onlyOwner {
        ecoList = _ecoList;
        ecoRent = _ecoRent;
        ecoKick = _ecoKick;
    }

    function rent() public {
        ecosystem.addContribution(msg.sender, ecoRent);
        ecosystem.addContribution(lister, ecoList);
    }

    function kick() public {
        ecosystem.addContribution(msg.sender, ecoKick);
    }

}