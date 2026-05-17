// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PuzzleGame {
    address public owner;
    uint256 public totalSolvedPuzzles;

    mapping(address => uint256) public lastCheckIn;
    mapping(address => uint256) public currentStreak;
    mapping(address => uint256) public points;

    event CheckedIn(address indexed user, uint256 streak, uint256 points);

    constructor() {
        owner = msg.sender;
    }

    function solvePuzzle() external {
        totalSolvedPuzzles += 1;
    }

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

        uint256 earnedPoints = 10 * currentStreak[msg.sender];
        points[msg.sender] += earnedPoints;

        emit CheckedIn(msg.sender, currentStreak[msg.sender], earnedPoints);
    }
}
