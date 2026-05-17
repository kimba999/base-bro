// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {PuzzleGame} from "../src/PuzzleGame.sol";

contract DeployPuzzleGame is Script {
    function run() external returns (PuzzleGame deployed) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        deployed = new PuzzleGame();
        vm.stopBroadcast();
    }
}
