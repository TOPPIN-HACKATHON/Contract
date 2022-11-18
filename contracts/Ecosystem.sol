// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Open Zeppelin libraries for controlling upgradability and access.
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Ecosystem is Initializable, UUPSUpgradeable, OwnableUpgradeable {

    struct epochInfo {
        uint256 lastUpdateTime;
        uint256 totalContribution; // 해당 주 총 기여도
        mapping(address => uint256) epochUserContribution; //user별 해당 주 기여도
        mapping(address => uint256) epochDistribution; // 토큰별 해당 주 분배량
    }
    
    struct EarnedData {
        address token;
        uint256 amount;
    }    

    //기존 컨트랙트
    address rentContract;
    address feeCollector;
    
    //수수료 보상 토큰들
    address[] public rewardTokens;
    uint256 epoch;


    mapping(address => uint256) userContribution;
    mapping(address => uint256) lastClaimEpoch;
    mapping(uint256 => epochInfo) Info;
    bool isShutdown = false;
    uint256 rewardsDuration = 86400 * 7;

        function initialize() public initializer {
       __Ownable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function rewardPerContribution(uint256 _epoch, address _token) public view returns(uint256) {
        return uint256(Info[_epoch].epochDistribution[_token] / Info[_epoch].totalContribution);
    }

    function _earned(
        address _user,
        address _rewardsToken,
        uint256 _epoch
    ) internal view returns(uint256) {
        return 
            rewardPerContribution(_epoch, _rewardsToken) * Info[_epoch].epochUserContribution[_user];
    }

    function claimableRewards(address _account) public view returns(EarnedData[] memory userRewards) {
        userRewards = new EarnedData[](rewardTokens.length);

        for (uint256 _epoch = lastClaimEpoch[_account]; _epoch < epoch; _epoch++) {
            for (uint256 i = 0; i < userRewards.length; i++) {
                address token = rewardTokens[i];
                userRewards[i].token = token;
                userRewards[i].amount += _earned(_account, token, _epoch);
                
            }
        }
        return userRewards;
    }


    function shutdown(bool _shutdown) external onlyOwner {
        isShutdown = _shutdown;
    }

    //수수료로 뿌려줄 토큰 추가
    function addReward(address _rewardsToken) public onlyOwner {
        rewardTokens.push(_rewardsToken);
    }

    //Fee distributor로 부터 뿌려줄 수수료 받기
    function getFee() public onlyOwner {
        require(block.number - Info[epoch].lastUpdateTime > rewardsDuration, "You cannot distribute fee yet");
        epoch += 1;
        Info[epoch].lastUpdateTime = block.number;
        for (uint i; i < rewardTokens.length; i++) {
            address rewardsToken = rewardTokens[i];
            uint256 balance = IERC20(rewardsToken).balanceOf(feeCollector);
            IERC20(rewardsToken).transferFrom(feeCollector, address(this), balance);
            Info[epoch].epochDistribution[rewardsToken] = balance;
        }
    }

    //기여도 측정(rent, kick이 일어날 때 얘 호출)
    function addContribution(address _user, uint40 amount) public {
        require(msg.sender == rentContract, "access denied");
        userContribution[_user] += amount;
    }

    function harvest(uint256 amount) public {
        require(amount > userContribution[msg.sender], "You cannot harvest more than your contribution");
        userContribution[msg.sender] -= amount;
        Info[epoch].totalContribution += amount;
        Info[epoch].epochUserContribution[msg.sender] += amount;
    }
    
    //유저에게 분배된 양 클레임
    function claim(address _user) public{
        require(epoch > lastClaimEpoch[_user], "You have to wait until the epoch end");
        lastClaimEpoch[_user] = epoch;
        EarnedData[] memory userRewards = claimableRewards(_user);
            for (uint256 i = 0; i < userRewards.length; i++) {
            IERC20(userRewards[i].token).transfer(_user, userRewards[i].amount);
        }

    }
}