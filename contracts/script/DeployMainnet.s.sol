// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {OpenDesk} from "../src/OpenDesk.sol";

/// @notice BSC mainnet deploy (chainId 56). Points at the live Agent ID registry.
///         Do not pass --broadcast until the project deployer is funded.
///         Simulation / gas estimate only is OK.
///
/// Env:
///   PRIVATE_KEY  (required) deployer key, typically decrypted from
///                ~/.opendesk/mainnet-keystore.json at run time. Do not echo it.
///   TREASURY     (optional) fee recipient on resolve. Defaults to deployer.
///   OPERATOR     (optional) resolveTicket caller. Defaults to deployer.
contract DeployMainnet is Script {
    uint256 internal constant MIN_FEE = 0.001 ether;
    address internal constant REGISTRY = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;

    function run() external {
        require(block.chainid == 56, "DeployMainnet: expected BSC mainnet (56)");

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address treasury = vm.envOr("TREASURY", deployer);
        address operator = vm.envOr("OPERATOR", deployer);

        require(treasury != address(0), "TREASURY is zero");
        require(operator != address(0), "OPERATOR is zero");
        require(REGISTRY.code.length > 0, "registry has no code on this chain");

        vm.startBroadcast(pk);
        OpenDesk desk = new OpenDesk(REGISTRY, treasury, operator, MIN_FEE);
        vm.stopBroadcast();

        console2.log("OpenDesk", address(desk));
        console2.log("registry", REGISTRY);
        console2.log("deployer", deployer);
        console2.log("treasury", treasury);
        console2.log("operator", operator);
        console2.log("minFee", MIN_FEE);
        console2.log("chainId", block.chainid);
    }
}
