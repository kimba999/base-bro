// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title BaseBroToken ($BRO) — mining, check-ins, on-chain fortune wheel
contract BaseBroToken is ERC20, Ownable {
    uint256 public constant DAILY_REWARD = 10 * 10 ** 18;
    uint256 public constant MAX_DAILY_SPINS = 3;

    /// @dev Wheel outcome codes (match frontend sectors 0–7)
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

    /// @notice Emitted on every successful `spinWheel` (on-chain randomness + prize).
    event WheelSpin(
        address indexed player,
        uint8 outcomeType,
        uint256 broAmount,
        uint8 roll,
        uint256 dailySpinsUsed
    );

    constructor() ERC20("Base Bro", "BRO") Ownable(msg.sender) {}

    function dailyCheckIn() external {
        uint256 last = lastCheckIn[msg.sender];

        require(
            last == 0 || block.timestamp >= last + 1 days,
            "Check-in allowed once per 24h"
        );

        if (last != 0 && block.timestamp < last + 48 hours) {
            currentStreak[msg.sender] += 1;
        } else {
            currentStreak[msg.sender] = 1;
        }

        lastCheckIn[msg.sender] = block.timestamp;
        _mint(msg.sender, DAILY_REWARD);

        emit CheckedIn(msg.sender, currentStreak[msg.sender], DAILY_REWARD);
    }

    function claimTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        uint256 mintAmount = amount * 10 ** 18;
        _mint(msg.sender, mintAmount);

        emit TokensClaimed(msg.sender, mintAmount);
    }

    /// @notice Effective spins used today (resets after 24h since last spin).
    function effectiveDailySpinCount(address account) public view returns (uint256) {
        uint256 last = lastSpinTimestamp[account];
        if (last == 0) {
            return 0;
        }
        if (block.timestamp >= last + 1 days) {
            return 0;
        }
        return dailySpinCount[account];
    }

    /// @notice On-chain fortune wheel. Payable for forward compatibility; no ETH fee required.
    function spinWheel() external payable {
        _resetSpinDayIfNeeded(msg.sender);

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

        (uint8 outcomeType, uint256 broAmount) = _resolveOutcome(roll);

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

    function _resetSpinDayIfNeeded(address account) internal {
        uint256 last = lastSpinTimestamp[account];
        if (last != 0 && block.timestamp >= last + 1 days) {
            dailySpinCount[account] = 0;
        }
    }

    function _resolveOutcome(uint256 roll)
        internal
        pure
        returns (uint8 outcomeType, uint256 broAmount)
    {
        if (roll <= 27) {
            return (OUTCOME_BRO_5, 5 * 10 ** 18);
        }
        if (roll <= 45) {
            return (OUTCOME_BRO_20, 20 * 10 ** 18);
        }
        if (roll <= 53) {
            return (OUTCOME_BRO_100, 100 * 10 ** 18);
        }
        if (roll == 54) {
            return (OUTCOME_JACKPOT, 500 * 10 ** 18);
        }
        if (roll <= 69) {
            return (OUTCOME_ENERGY, 0);
        }
        if (roll <= 81) {
            return (OUTCOME_STREAK_SHIELD, 0);
        }
        if (roll <= 94) {
            return (OUTCOME_TAP_MULTIPLIER, 0);
        }
        return (OUTCOME_GLITCH, 0);
    }
}
