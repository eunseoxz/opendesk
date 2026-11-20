// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Agent ID registry surface used by OpenDesk.
/// Mainnet SPACE ID Agent ID is one possible implementation; inject via constructor.
interface IAgentIdRegistry {
    function balanceOf(address owner) external view returns (uint256);
}
