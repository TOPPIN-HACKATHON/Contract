// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Open Zeppelin libraries for controlling upgradability and access.
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Rentropy721 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Rentinfo {
        address lender_address;
        address collateral_token;
        uint256 maxrent_duration;
        uint256 collateral_amount;
        uint256 rent_fee_per_block;
        uint256 list_block;
        uint256 expire_duration;
        address renter_address;
        uint256 rent_duration;
        uint256 rent_block;
    }

    address public operator;
    address public fee_collector;
    uint256 public platform_fee;
    uint256 public kick_incentive;
    uint256 public execution_delay;
    uint256 public fee_denominator;
    bool public paused;

    mapping(address => mapping(uint256 => Rentinfo)) public rentinfo;

    /* ============ constructor ============*/

    function initialize(address _operator) public initializer {
       operator = _operator;
       platform_fee = 25000;
       kick_incentive = 10000;
       execution_delay = 2 days;
       fee_denominator = 1e6;
       paused = false;
       __Ownable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /* ============ modifier ============*/

    modifier notPaused() {
        require(!paused, "system paused");
        _;
    }

    modifier onlyLister(address collection_address, uint256 token_id) {
        require(msg.sender == rentinfo[collection_address][token_id].lender_address, "Only lister can do");
        _;
    }

    modifier ListerorOperator(address collection_address, uint256 token_id) {
        require(msg.sender == rentinfo[collection_address][token_id].lender_address || msg.sender == operator, "Only lister or Operator can do");
        _;
    }

    /* ============ view function ============*/
    function viewRentinfo(address collection_address, uint256 token_id) external view returns(Rentinfo memory) {
        return rentinfo[collection_address][token_id];
    }

    function viewRemainblock(address collection_address, uint256 token_id) external view returns(uint256) {
        if (block.number - rentinfo[collection_address][token_id].rent_block < rentinfo[collection_address][token_id].rent_duration) {
            return rentinfo[collection_address][token_id].rent_duration - (block.number - rentinfo[collection_address][token_id].rent_block);
        } else {
            return 0;
        }
    }

    function viewPlatformfee() external view returns(uint256) {
        return platform_fee;
    }

    function viewKickincentive() external view returns(uint256) {
        return kick_incentive;
    }

    function viewExcutiondelay() external view returns(uint256) {
        return execution_delay;
    }

    function viewExpired(address collection_address, uint256 token_id) external view returns(bool) {
        return rentinfo[collection_address][token_id].list_block + rentinfo[collection_address][token_id].expire_duration < block.number;
    }


    /* ============ set function ============*/

    function setOperator (address _fee_collector) external onlyOwner {
        fee_collector = _fee_collector;
    }

    function setFeecollector (address _fee_collector) external onlyOwner {
        fee_collector = _fee_collector;
    }

    function setPlatformfee (uint256 _platform_fee) external onlyOwner {
        platform_fee = _platform_fee;
    }
    
    function setKickincentive (uint256 _kick_incentive) external onlyOwner {
        kick_incentive = _kick_incentive;
    }

    function setExecutiondelay (uint256 _execution_delay) external onlyOwner {
        execution_delay = _execution_delay;
    }

    function setPaused(bool _pause) external onlyOwner {
        paused = _pause;        
    }

    /* ============ main function ============*/

    function NFTlist(
        address collection_address,
        uint256 token_id,
        address _collateral_token,
        uint256 _maxrent_duration,
        uint256 _collateral_amount,
        uint256 _rent_fee_per_block,
        uint256 _expire_duration
        ) public virtual notPaused {
        
        require(msg.sender == IERC721(collection_address).ownerOf(token_id), "You are not the owner");
        require(rentinfo[collection_address][token_id].rent_block == 0, "already rented item!");

        rentinfo[collection_address][token_id] = Rentinfo ({
            lender_address : msg.sender,
            collateral_token : _collateral_token,
            maxrent_duration : _maxrent_duration,
            collateral_amount : _collateral_amount,
            rent_fee_per_block : _rent_fee_per_block,
            list_block : block.number,
            expire_duration : _expire_duration,
            renter_address : address(0),
            rent_duration : 0,
            rent_block : 0
        });

        emit NFTlisted(msg.sender, collection_address, token_id, _collateral_token, _collateral_amount, _maxrent_duration, _rent_fee_per_block, block.number, _expire_duration);
    }

    enum PARAMETER { COLLAT, MAXRENT, PRICE, BLOCKFEE, EXPIREDURATION }

    function modifyList(address collection_address, uint256 token_id, PARAMETER _parameter, uint256 _input) public onlyLister(collection_address, token_id) notPaused {
        require(rentinfo[collection_address][token_id].rent_block == 0, "already rented item!");
        if (_parameter == PARAMETER.COLLAT) { // 0
            rentinfo[collection_address][token_id].collateral_token = address(uint160(_input));
        } else if (_parameter == PARAMETER.MAXRENT) { // 1
            rentinfo[collection_address][token_id].maxrent_duration = _input;
        } else if (_parameter == PARAMETER.PRICE) { // 2
            rentinfo[collection_address][token_id].collateral_amount = _input;
        } else if (_parameter == PARAMETER.BLOCKFEE) { // 3
            rentinfo[collection_address][token_id].rent_fee_per_block = _input;
        } else if (_parameter == PARAMETER.EXPIREDURATION) { // 4
            rentinfo[collection_address][token_id].expire_duration = _input;
        }

        emit NFTlistmodified(msg.sender, collection_address, token_id, _parameter, _input );
    }

    function cancelList(address collection_address, uint256 token_id) public ListerorOperator(collection_address, token_id) notPaused {
        require(rentinfo[collection_address][token_id].rent_block == 0, "already rented item!");

        delete rentinfo[collection_address][token_id];
        emit NFTlistcancel(msg.sender, collection_address, token_id);
    }

    function rent(address collection_address, uint256 token_id, uint256 _rent_duration) public notPaused {
        Rentinfo memory info = rentinfo[collection_address][token_id];
        require(info.lender_address != address(0), "Not listed");
        require(_rent_duration > 0, "You should rent more than 1 block");
        require(info.rent_duration == 0, "Already rented");
        require(_rent_duration <= info.maxrent_duration, "You can't rent more than max rent duration");
        require(block.number < info.list_block + info.expire_duration, "Expired List");

        uint256 rent_fee = info.rent_fee_per_block * _rent_duration;
        uint256 total = info.collateral_amount + rent_fee;

        rentinfo[collection_address][token_id].renter_address = msg.sender;
        rentinfo[collection_address][token_id].rent_duration = _rent_duration;
        rentinfo[collection_address][token_id].rent_block = block.number;

        IERC20(info.collateral_token).transferFrom(msg.sender, address(this), total);
        IERC721(collection_address).transferFrom(info.lender_address, msg.sender, token_id);

        emit NFTrented(msg.sender, collection_address, token_id, block.number, _rent_duration, info.collateral_amount, rent_fee);
    }

    function returnNFT(address collection_address, uint256 token_id) public notPaused {
        Rentinfo memory info = rentinfo[collection_address][token_id];
        require(info.lender_address != address(0) && info.renter_address != address(0), "Not listed && Not rented");
        require(block.number - info.rent_block <= info.rent_duration, "Timeout");
        require(msg.sender == info.renter_address, "You are not renter");


        uint256 fee_amount = info.rent_fee_per_block * info.rent_duration;
        uint256 platformfee = fee_amount * platform_fee / fee_denominator;
        fee_amount = fee_amount - platformfee; 

        delete rentinfo[collection_address][token_id];

        IERC721(collection_address).transferFrom(msg.sender, info.lender_address, token_id);

        IERC20(info.collateral_token).transfer(msg.sender, info.collateral_amount);
        IERC20(info.collateral_token).transfer(info.lender_address, fee_amount);
        IERC20(info.collateral_token).transfer(fee_collector, platformfee);

        emit NFTreturned(msg.sender, collection_address, token_id, info.collateral_amount, fee_amount);
    }

    function withdrawCollateral (address collection_address, uint256 token_id) public notPaused {
        Rentinfo memory info = rentinfo[collection_address][token_id];
        require(info.lender_address != address(0) && info.renter_address != address(0), "Not listed && Not rented");
        require(block.number - info.rent_block > info.rent_duration, "You can't withdraw collateral now");
        require(msg.sender == info.lender_address, "You are not holder");

        uint256 fee_amount = info.rent_fee_per_block * info.rent_duration;
        uint256 platformfee = fee_amount * platform_fee / fee_denominator; 
        uint256 total = info.collateral_amount + fee_amount - platformfee;

        delete rentinfo[collection_address][token_id];

        IERC20(info.collateral_token).transfer(msg.sender, total);
        IERC20(info.collateral_token).transfer(fee_collector, platformfee);
        
        emit Collateralwithdraw(msg.sender, collection_address, token_id, info.collateral_amount, fee_amount);
    }

    function kick (address collection_address, uint256 token_id) public notPaused {
        Rentinfo memory info = rentinfo[collection_address][token_id];
        require(info.lender_address != address(0) && info.renter_address != address(0), "Not listed && Not rented");
        require((block.number - info.rent_block) > (info.rent_duration + execution_delay) , "You can't kick now.");

        uint256 fee_amount = info.rent_fee_per_block * info.rent_duration;
        uint256 platformfee = fee_amount * platform_fee / fee_denominator;
        uint256 kickfee = fee_amount * kick_incentive / fee_denominator;
        uint256 total = info.collateral_amount + fee_amount - platformfee - kickfee;

        delete rentinfo[collection_address][token_id];

        IERC20(info.collateral_token).transfer(msg.sender, kickfee);
        IERC20(info.collateral_token).transfer(info.lender_address, total);
        IERC20(info.collateral_token).transfer(fee_collector, platformfee);

        emit NFTkicked(msg.sender, collection_address, token_id, info.collateral_amount, fee_amount);
    }


    event NFTlisted(address from_address, address collection_address, uint256 token_id, address collateral_token, uint256 collateral_amount, uint256 max_rent_duration, uint256 rent_fee_per_block, uint256 list_block, uint256 expire_duration);
    event NFTlistcancel(address from_address, address collection_address, uint256 token_id);
    event NFTlistmodified(address from_address, address collection_address, uint256 token_id, PARAMETER parameter, uint256 input);
    event NFTrented(address from_address, address collection_address, uint256 token_id, uint256 rent_block, uint256 rent_duration, uint256 collateral_amount, uint256 rent_fee);
    event NFTreturned(address from_address, address collection_address, uint256 token_id, uint256 collateral_amount, uint256 fee_amount);
    event Collateralwithdraw(address from_address, address collection_address, uint256 token_id, uint256 collateral_amount, uint256 fee_amount);
    event NFTkicked(address from_address, address collection_address, uint256 token_id, uint256 collateral_amount, uint256 fee_amount);

}