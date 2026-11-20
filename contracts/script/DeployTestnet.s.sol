// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {OpenDesk} from "../src/OpenDesk.sol";
import {MockAgentIdRegistry} from "../src/mocks/MockAgentIdRegistry.sol";

contract DeployTestnet is Script {
    uint256 internal constant MIN_FEE = 0.001 ether;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        MockAgentIdRegistry registry = new MockAgentIdRegistry();
        // treasury = deployer for testnet soft-launch; operator = deployer
        OpenDesk desk = new OpenDesk(address(registry), deployer, deployer, MIN_FEE);
        registry.mint(deployer, 1);

        vm.stopBroadcast();

        console2.log("MockAgentIdRegistry", address(registry));
        console2.log("OpenDesk", address(desk));
        console2.log("deployer", deployer);
        console2.log("minFee", MIN_FEE);
    }
}
