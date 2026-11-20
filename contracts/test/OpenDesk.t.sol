// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OpenDesk} from "../src/OpenDesk.sol";
import {MockAgentIdRegistry} from "../src/mocks/MockAgentIdRegistry.sol";

contract OpenDeskTest is Test {
    MockAgentIdRegistry internal registry;
    OpenDesk internal desk;
    address internal owner = address(this);
    address internal treasury = makeAddr("treasury");
    address internal operator = makeAddr("operator");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    uint256 internal constant MIN_FEE = 0.001 ether;

    function setUp() public {
        // Zero gas price so refund/balance asserts stay exact if this file is
        // run against a fork (BSC / anvil default gas price would debit the EOA).
        vm.txGasPrice(0);
        registry = new MockAgentIdRegistry();
        desk = new OpenDesk(address(registry), treasury, operator, MIN_FEE);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function test_HasAgentId() public {
        assertFalse(desk.hasAgentId(alice));
        registry.mint(alice, 1);
        assertTrue(desk.hasAgentId(alice));
    }

    function test_OpenTicket_ok() public {
        registry.mint(alice, 1);
        vm.prank(alice);
        uint256 id = desk.openTicket{value: MIN_FEE}("Help", "tech", "please");
        assertEq(id, 1);
        (
            address agent,
            uint256 fee,
            string memory title,
            string memory category,
            string memory note,
            OpenDesk.Status status,
        ) = desk.getTicket(id);
        assertEq(agent, alice);
        assertEq(fee, MIN_FEE);
        assertEq(title, "Help");
        assertEq(category, "tech");
        assertEq(note, "please");
        assertEq(uint8(status), uint8(OpenDesk.Status.Open));
        assertEq(desk.ticketCountOf(alice), 1);
        assertEq(address(desk).balance, MIN_FEE);
    }

    function test_OpenTicket_revertsWithoutAgentId() public {
        vm.prank(alice);
        vm.expectRevert(OpenDesk.NoAgentId.selector);
        desk.openTicket{value: MIN_FEE}("Help", "tech", "x");
    }

    function test_OpenTicket_revertsBelowMinFee() public {
        registry.mint(alice, 1);
        vm.prank(alice);
        vm.expectRevert(OpenDesk.FeeTooLow.selector);
        desk.openTicket{value: MIN_FEE - 1}("Help", "tech", "x");
    }

    function test_CancelRefund() public {
        registry.mint(alice, 1);
        vm.prank(alice);
        uint256 id = desk.openTicket{value: MIN_FEE}("Help", "tech", "x");
        uint256 beforeBal = alice.balance;
        vm.prank(alice);
        desk.cancelTicket(id);
        assertEq(alice.balance, beforeBal + MIN_FEE);
        (, , , , , OpenDesk.Status status,) = desk.getTicket(id);
        assertEq(uint8(status), uint8(OpenDesk.Status.Cancelled));
        assertEq(address(desk).balance, 0);
    }

    function test_Resolve_noRefund() public {
        registry.mint(alice, 1);
        vm.prank(alice);
        uint256 id = desk.openTicket{value: MIN_FEE}("Help", "tech", "x");
        uint256 aliceBefore = alice.balance;
        uint256 treasuryBefore = treasury.balance;
        vm.prank(operator);
        desk.resolveTicket(id);
        assertEq(alice.balance, aliceBefore);
        assertEq(treasury.balance, treasuryBefore + MIN_FEE);
        (, , , , , OpenDesk.Status status,) = desk.getTicket(id);
        assertEq(uint8(status), uint8(OpenDesk.Status.Resolved));
        // cancel after resolve must fail
        vm.prank(alice);
        vm.expectRevert(OpenDesk.NotOpen.selector);
        desk.cancelTicket(id);
    }

    function test_Pause() public {
        registry.mint(alice, 1);
        desk.pause();
        vm.prank(alice);
        vm.expectRevert();
        desk.openTicket{value: MIN_FEE}("Help", "tech", "x");
        desk.unpause();
        vm.prank(alice);
        uint256 id = desk.openTicket{value: MIN_FEE}("Help", "tech", "x");
        assertEq(id, 1);
    }
}
