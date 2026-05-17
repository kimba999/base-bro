// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BAZA} from "../src/BazaToken.sol";

contract DeployBazaToken is Script {
    function run() external returns (BAZA deployed) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        deployed = new BAZA();
        vm.stopBroadcast();
    }
}
