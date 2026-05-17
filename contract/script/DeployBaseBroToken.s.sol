// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BaseBroToken} from "../src/BaseBroToken.sol";

contract DeployBaseBroToken is Script {
    function run() external returns (BaseBroToken deployed) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        deployed = new BaseBroToken();
        vm.stopBroadcast();
    }
}
