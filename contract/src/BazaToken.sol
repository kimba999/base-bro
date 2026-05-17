// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract BAZA is ERC20 {
    uint256 public constant DAILY_REWARD = 10 * 10 ** 18;

    mapping(address => uint256) public lastCheckIn;
    mapping(address => uint256) public currentStreak;

    event CheckedIn(address indexed user, uint256 streak, uint256 mintedAmount);
    event TokensClaimed(address indexed user, uint256 amount);

    constructor() ERC20("BAZA", "BAZA") {}

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
}
