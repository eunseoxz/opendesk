// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentIdRegistry} from "../interfaces/IAgentIdRegistry.sol";

/// @dev Test and testnet stand-in for the Agent ID registry. Not for mainnet.
contract MockAgentIdRegistry is IAgentIdRegistry {
    mapping(address => uint256) private _balances;

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
    }

    function setBalance(address to, uint256 amount) external {
        _balances[to] = amount;
    }
}
