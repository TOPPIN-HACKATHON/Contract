// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Open Zeppelin libraries for controlling upgradability and access.
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./Interface.sol";

contract RentContract is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Rentinfo {
        address nftOwner;
        address token;
        uint256 amount;
        address renterAddress;
        uint256 maxRent;
        uint256 rentDuration;
    }
    bool public paused;
    mapping(address => Rentinfo) public rentinfo;

    function initialize() public initializer {
        paused = false;
        __Ownable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    modifier notPaused() {
        require(!paused, "system paused");
        _;
    }

    function viewRentinfo(address tba) external view returns (Rentinfo memory) {
        return rentinfo[tba];
    }

    function list(
        address tba,
        address collection,
        uint256 token_id,
        address _token,
        uint256 _amount,
        uint256 _duration
    ) public notPaused {
        require(
            msg.sender == IERC721(collection).ownerOf(token_id),
            "You are not the owner"
        );
        rentinfo[tba] = Rentinfo({
            nftOwner: msg.sender,
            token: _token,
            amount: _amount,
            maxRent: _duration,
            renterAddress: address(0),
            rentDuration: 0
        });
    }

    function rental(IERC6551Account tba, uint256 _duration) external notPaused {
        Rentinfo memory info = rentinfo[address(tba)];
        require(info.nftOwner != address(0), "Not listed");
        require(_duration > 0, "You should rent more than 1 block");
        require(_duration < info.maxRent, "Cannot Rent more than maxRent");
        require(block.number > info.rentDuration, "Already rented");

        rentinfo[address(tba)].renterAddress = msg.sender;
        rentinfo[address(tba)].rentDuration = block.number + _duration;

        IERC20(info.token).transferFrom(msg.sender, info.nftOwner, info.amount);
        tba.rental(msg.sender, info.rentDuration);
    }
}
