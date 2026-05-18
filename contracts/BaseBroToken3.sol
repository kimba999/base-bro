// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Remix-deployed source (matches contract_input.json / BaseScan verification).
contract BaseBroToken is ERC20, Ownable {
    uint256 public constant DAILY_REWARD = 10 * 10 ** 18;
    uint256 public constant MAX_DAILY_SPINS = 3;

    uint8 public constant OUTCOME_BRO_5 = 0;
    uint8 public constant OUTCOME_BRO_20 = 1;
    uint8 public constant OUTCOME_BRO_100 = 2;
    uint8 public constant OUTCOME_JACKPOT = 3;
    uint8 public constant OUTCOME_ENERGY = 4;
    uint8 public constant OUTCOME_STREAK_SHIELD = 5;
    uint8 public constant OUTCOME_TAP_MULTIPLIER = 6;
    uint8 public constant OUTCOME_GLITCH = 7;

    mapping(address => uint256) public lastCheckIn;
    mapping(address => uint256) public currentStreak;

    mapping(address => uint256) public lastSpinTimestamp;
    mapping(address => uint256) public dailySpinCount;

    event CheckedIn(address indexed user, uint256 streak, uint256 mintedAmount);
    event TokensClaimed(address indexed user, uint256 amount);

    event WheelSpin(
        address indexed player,
        uint8 outcomeType,
        uint256 broAmount,
        uint8 roll,
        uint256 dailySpinsUsed
    );

    constructor() ERC20("Base Bro", "BRO") Ownable(msg.sender) {}

    function dailyCheckIn() external {
        require(
            block.timestamp >= lastCheckIn[msg.sender] + 1 days,
            "Already checked in today"
        );

        if (
            lastCheckIn[msg.sender] != 0 &&
            block.timestamp <= lastCheckIn[msg.sender] + 2 days
        ) {
            currentStreak[msg.sender] += 1;
        } else {
            currentStreak[msg.sender] = 1;
        }

        lastCheckIn[msg.sender] = block.timestamp;
        uint256 amountToMint = DAILY_REWARD;
        _mint(msg.sender, amountToMint);

        emit CheckedIn(msg.sender, currentStreak[msg.sender], amountToMint);
    }

    function claimTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        uint256 mintAmount = amount * 10 ** 18;
        _mint(msg.sender, mintAmount);
        emit TokensClaimed(msg.sender, mintAmount);
    }

    function effectiveDailySpinCount(address account) public view returns (uint256) {
        uint256 last = lastSpinTimestamp[account];
        if (last == 0) return 0;
        if (block.timestamp >= last + 1 days) return 0;
        return dailySpinCount[account];
    }

    function spinWheel() external payable {
        uint256 last = lastSpinTimestamp[msg.sender];
        if (last != 0 && block.timestamp >= last + 1 days) {
            dailySpinCount[msg.sender] = 0;
        }

        require(
            dailySpinCount[msg.sender] < MAX_DAILY_SPINS,
            "Daily limit of 3 spins reached"
        );

        uint256 roll = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    dailySpinCount[msg.sender],
                    block.number
                )
            )
        ) % 100;

        uint8 outcomeType;
        uint256 broAmount = 0;

        if (roll <= 27) {
            outcomeType = OUTCOME_BRO_5;
            broAmount = 5 * 10 ** 18;
        } else if (roll <= 45) {
            outcomeType = OUTCOME_BRO_20;
            broAmount = 20 * 10 ** 18;
        } else if (roll <= 53) {
            outcomeType = OUTCOME_BRO_100;
            broAmount = 100 * 10 ** 18;
        } else if (roll == 54) {
            outcomeType = OUTCOME_JACKPOT;
            broAmount = 500 * 10 ** 18;
        } else if (roll <= 69) {
            outcomeType = OUTCOME_ENERGY;
        } else if (roll <= 81) {
            outcomeType = OUTCOME_STREAK_SHIELD;
        } else if (roll <= 94) {
            outcomeType = OUTCOME_TAP_MULTIPLIER;
        } else {
            outcomeType = OUTCOME_GLITCH;
        }

        if (broAmount > 0) {
            _mint(msg.sender, broAmount);
        }

        dailySpinCount[msg.sender] += 1;
        lastSpinTimestamp[msg.sender] = block.timestamp;

        emit WheelSpin(
            msg.sender,
            outcomeType,
            broAmount,
            uint8(roll),
            dailySpinCount[msg.sender]
        );
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
