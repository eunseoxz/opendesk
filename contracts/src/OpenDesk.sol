// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAgentIdRegistry} from "./interfaces/IAgentIdRegistry.sol";

/// @title OpenDesk
/// @notice Paid service desk gated by Agent ID. Fee is held until resolve (to treasury)
///         or cancel (refund to opener). Owner can only pause/unpause.
contract OpenDesk is Ownable, Pausable, ReentrancyGuard {
    enum Status {
        None,
        Open,
        Resolved,
        Cancelled
    }

    struct Ticket {
        address agent;
        uint256 fee;
        string title;
        string category;
        string note;
        Status status;
        uint64 openedAt;
    }

    IAgentIdRegistry public immutable registry;
    address public immutable treasury;
    address public immutable operator;
    uint256 public immutable minFee;

    uint256 public nextTicketId = 1;
    mapping(uint256 => Ticket) private _tickets;
    mapping(address => uint256) public ticketCountOf;

    event TicketOpened(
        uint256 indexed ticketId,
        address indexed agent,
        uint256 fee,
        string title,
        string category
    );
    event TicketResolved(uint256 indexed ticketId, address indexed operator_);
    event TicketCancelled(uint256 indexed ticketId, address indexed agent, uint256 refund);

    error NoAgentId();
    error FeeTooLow();
    error BadTreasury();
    error BadOperator();
    error BadRegistry();
    error BadMinFee();
    error NotOpener();
    error NotOperator();
    error NotOpen();
    error EmptyTitle();
    error TransferFailed();

    constructor(
        address registry_,
        address treasury_,
        address operator_,
        uint256 minFee_
    ) Ownable(msg.sender) {
        if (registry_ == address(0)) revert BadRegistry();
        if (treasury_ == address(0)) revert BadTreasury();
        if (operator_ == address(0)) revert BadOperator();
        if (minFee_ == 0) revert BadMinFee();
        registry = IAgentIdRegistry(registry_);
        treasury = treasury_;
        operator = operator_;
        minFee = minFee_;
    }

    function hasAgentId(address user) public view returns (bool) {
        return registry.balanceOf(user) > 0;
    }

    function getTicket(uint256 ticketId)
        external
        view
        returns (
            address agent,
            uint256 fee,
            string memory title,
            string memory category,
            string memory note,
            Status status,
            uint64 openedAt
        )
    {
        Ticket storage t = _tickets[ticketId];
        return (t.agent, t.fee, t.title, t.category, t.note, t.status, t.openedAt);
    }

    function openTicket(string calldata title, string calldata category, string calldata note)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256 ticketId)
    {
        if (!hasAgentId(msg.sender)) revert NoAgentId();
        if (msg.value < minFee) revert FeeTooLow();
        if (bytes(title).length == 0) revert EmptyTitle();

        ticketId = nextTicketId++;
        _tickets[ticketId] = Ticket({
            agent: msg.sender,
            fee: msg.value,
            title: title,
            category: category,
            note: note,
            status: Status.Open,
            // casting to uint64 is safe for timestamps far beyond project lifetime
            // forge-lint: disable-next-line(unsafe-typecast)
            openedAt: uint64(block.timestamp)
        });
        ticketCountOf[msg.sender] += 1;

        // Fee stays in this contract until resolve (forward to treasury) or cancel (refund).
        // Needed so cancel+refund before resolve works without pulling from treasury.
        emit TicketOpened(ticketId, msg.sender, msg.value, title, category);
    }

    function cancelTicket(uint256 ticketId) external nonReentrant {
        Ticket storage t = _tickets[ticketId];
        if (t.status != Status.Open) revert NotOpen();
        if (t.agent != msg.sender) revert NotOpener();

        uint256 refund = t.fee;
        t.status = Status.Cancelled;
        t.fee = 0;

        emit TicketCancelled(ticketId, msg.sender, refund);

        (bool ok,) = payable(msg.sender).call{value: refund}("");
        if (!ok) revert TransferFailed();
    }

    function resolveTicket(uint256 ticketId) external nonReentrant {
        if (msg.sender != operator) revert NotOperator();
        Ticket storage t = _tickets[ticketId];
        if (t.status != Status.Open) revert NotOpen();

        uint256 fee = t.fee;
        t.status = Status.Resolved;
        t.fee = 0;

        emit TicketResolved(ticketId, msg.sender);

        (bool ok,) = payable(treasury).call{value: fee}("");
        if (!ok) revert TransferFailed();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
