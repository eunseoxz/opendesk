// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {OpenDesk} from "../src/OpenDesk.sol";
import {IAgentIdRegistry} from "../src/interfaces/IAgentIdRegistry.sol";

/// @dev Fork-only. Run with --fork-url pointing at BSC mainnet or a local anvil fork.
///      Uses the live SPACE ID Agent ID registry (no mock).
interface IAgentIdLookup {
    function ownerOfHandle(string calldata handle) external view returns (address);
    function handleOf(address owner) external view returns (string memory);
}

contract OpenDeskMainnetForkTest is Test {
    address internal constant REGISTRY = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;
    uint256 internal constant MIN_FEE = 0.001 ether;

    // Known public handles used only as a fallback if ownerOfHandle reverts.
    address internal constant ZAP_HOLDER = 0x5B95b1fc7C092B75D8A2220c770CC9cFe10f6723;
    address internal constant YIZHUO_HOLDER = 0x26647463B44f602e91b92308A096BcCEcA7C7222;

    OpenDesk internal desk;
    address internal treasury;
    address internal operator;
    address internal holder;

    function setUp() public {
        require(block.chainid == 56, "fork BSC mainnet (chainId 56)");
        treasury = makeAddr("treasury");
        operator = makeAddr("operator");
        desk = new OpenDesk(REGISTRY, treasury, operator, MIN_FEE);
        holder = _findHolder();
    }

    function test_RegistryCodeExists() public view {
        assertGt(REGISTRY.code.length, 0, "registry has no code");
    }

    function test_HasAgentId_zeroBalanceEoaFalse() public view {
        address eoa = address(0xBEEF);
        assertEq(IAgentIdRegistry(REGISTRY).balanceOf(eoa), 0);
        assertFalse(desk.hasAgentId(eoa));
    }

    function test_HasAgentId_realHolderTrue() public {
        assertTrue(holder != address(0), "no Agent ID holder found on fork");
        assertGt(IAgentIdRegistry(REGISTRY).balanceOf(holder), 0, "holder balanceOf is 0");
        assertTrue(desk.hasAgentId(holder), "hasAgentId should be true for a live holder");
        console2.log("holder", holder);
        console2.log("holder balanceOf", IAgentIdRegistry(REGISTRY).balanceOf(holder));
    }

    function test_OpenTicket_revertsWithoutAgentId() public {
        address eoa = makeAddr("nobody");
        vm.deal(eoa, 1 ether);
        vm.prank(eoa);
        vm.expectRevert(OpenDesk.NoAgentId.selector);
        desk.openTicket{value: MIN_FEE}("Help", "Tech check", "fork");
    }

    function test_OpenTicket_succeedsForRealHolder() public {
        assertTrue(holder != address(0), "no Agent ID holder found on fork");
        assertTrue(desk.hasAgentId(holder));
        vm.deal(holder, 1 ether);
        vm.prank(holder);
        uint256 id = desk.openTicket{value: MIN_FEE}("Fork ping", "Demo ping", "real holder");
        assertEq(id, 1);
        (
            address agent,
            uint256 fee,
            string memory title,
            string memory category,
            string memory note,
            OpenDesk.Status status,
        ) = desk.getTicket(id);
        assertEq(agent, holder);
        assertEq(fee, MIN_FEE);
        assertEq(title, "Fork ping");
        assertEq(category, "Demo ping");
        assertEq(note, "real holder");
        assertEq(uint8(status), uint8(OpenDesk.Status.Open));
        assertEq(address(desk).balance, MIN_FEE);
    }

    function test_DeployGasLog() public {
        uint256 start = gasleft();
        OpenDesk fresh = new OpenDesk(REGISTRY, treasury, operator, MIN_FEE);
        uint256 used = start - gasleft();
        console2.log("OpenDesk deploy gas approx (includes measure overhead)", used);
        assertEq(address(fresh.registry()), REGISTRY);
    }

    function _findHolder() internal view returns (address) {
        IAgentIdLookup lookup = IAgentIdLookup(REGISTRY);
        string[4] memory handles = [string("zap"), "yizhuo", "alice", "demo"];
        for (uint256 i = 0; i < handles.length; i++) {
            try lookup.ownerOfHandle(handles[i]) returns (address a) {
                if (a != address(0) && IAgentIdRegistry(REGISTRY).balanceOf(a) > 0) {
                    return a;
                }
            } catch {}
        }
        if (IAgentIdRegistry(REGISTRY).balanceOf(ZAP_HOLDER) > 0) return ZAP_HOLDER;
        if (IAgentIdRegistry(REGISTRY).balanceOf(YIZHUO_HOLDER) > 0) return YIZHUO_HOLDER;
        return address(0);
    }
}
