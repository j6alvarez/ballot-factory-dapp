// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract Ballot {
    struct Proposal {
        bytes32 name;
        uint voteCount;
    }

    struct Voter {
        bool hasVoted;
        bool isWhitelisted;
        uint votedProposalId;
        address delegate;
        uint weight;
    }

    Proposal[] public proposals;
    mapping(address => Voter) public voters;
    
    // Replace single owner with admin mapping
    address public owner;
    mapping(address => bool) public admins;
    
    uint256 public totalVoters;
    uint256 public votesCount;
    bool public votingOpen;
    bool public allowDelegation;
    uint256 public maxVotes;

    event VoterWhitelisted(address indexed voter);
    event VoteCast(address indexed voter, uint proposalId);
    event VotingStateChanged(bool isOpen);
    event DelegatedVote(address indexed from, address indexed to);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Only admin can call this function");
        _;
    }

    modifier votingIsOpen() {
        require(votingOpen, "Voting is not open");
        _;
    }

    constructor(bytes32[] memory _proposalNames, uint256 _maxVotes, bool _allowDelegation, address _owner) {
        require(_proposalNames.length > 0, "Must have at least one proposal");
        require(_proposalNames.length <= 5, "Maximum 5 proposals allowed");
        
        owner = _owner;
        admins[_owner] = true; // Make owner an admin by default
        
        votingOpen = true;
        allowDelegation = _allowDelegation;
        maxVotes = _maxVotes;
        
        for (uint i = 0; i < _proposalNames.length; i++) {
            proposals.push(Proposal({name: _proposalNames[i], voteCount: 0}));
        }
    }

    // Function to add a new admin (only owner can add admins)
    function addAdmin(address _admin) external {
        require(msg.sender == owner, "Only owner can add admins");
        require(!admins[_admin], "Address is already an admin");
        
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    // Function to remove an admin (only owner can remove admins)
    function removeAdmin(address _admin) external {
        require(msg.sender == owner, "Only owner can remove admins");
        require(_admin != owner, "Cannot remove owner from admin role");
        require(admins[_admin], "Address is not an admin");
        
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    // Check if an address is an admin
    function isAdmin(address _address) external view returns (bool) {
        return admins[_address] || _address == owner;
    }

    function whitelistVoter(address _voter) external onlyAdmin {
        require(!voters[_voter].isWhitelisted, "Voter already whitelisted");
        require(totalVoters < maxVotes, "Maximum number of voters reached");
        
        voters[_voter].isWhitelisted = true;
        voters[_voter].weight = 1;
        totalVoters++;
        
        emit VoterWhitelisted(_voter);
    }

    function whitelistVoters(address[] calldata _voters) external onlyAdmin {
        for (uint i = 0; i < _voters.length && totalVoters < maxVotes; i++) {
            if (!voters[_voters[i]].isWhitelisted) {
                voters[_voters[i]].isWhitelisted = true;
                voters[_voters[i]].weight = 1;
                totalVoters++;
                emit VoterWhitelisted(_voters[i]);
            }
        }
    }

    function delegate(address _to) external votingIsOpen {
        require(allowDelegation, "Delegation not allowed in this ballot");
        require(voters[msg.sender].isWhitelisted, "Not whitelisted to vote");
        require(!voters[msg.sender].hasVoted, "Already voted");
        require(_to != msg.sender, "Cannot delegate to yourself");
        require(voters[_to].isWhitelisted, "Delegate not whitelisted");
        
        // Forward the delegation if the delegate also delegated
        address to = _to;
        while (voters[to].delegate != address(0)) {
            to = voters[to].delegate;
            require(to != msg.sender, "Loop in delegation detected");
        }
        
        voters[msg.sender].delegate = to;
        voters[msg.sender].hasVoted = true;
        
        // If the delegate has already voted, add weight to their proposal
        if (voters[to].hasVoted) {
            proposals[voters[to].votedProposalId].voteCount += voters[msg.sender].weight;
        } else {
            // Otherwise increase the delegate's weight
            voters[to].weight += voters[msg.sender].weight;
        }
        
        emit DelegatedVote(msg.sender, to);
    }

    function vote(uint256 _proposalId) external votingIsOpen {
        require(voters[msg.sender].isWhitelisted, "Not whitelisted to vote");
        require(!voters[msg.sender].hasVoted, "Already voted");
        require(_proposalId < proposals.length, "Invalid proposal");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _proposalId;
        
        // Count votes according to weight (which accounts for delegations)
        proposals[_proposalId].voteCount += voters[msg.sender].weight;
        votesCount++;

        emit VoteCast(msg.sender, _proposalId);
    }

    function setVotingState(bool _isOpen) external onlyAdmin {
        votingOpen = _isOpen;
        emit VotingStateChanged(_isOpen);
    }

    function winningProposal() public view returns (uint winningProposalId) {
        uint winningVoteCount = 0;
        for (uint p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposalId = p;
            }
        }
    }

    function winnerName() external view returns (bytes32 winnerName_) {
        winnerName_ = proposals[winningProposal()].name;
    }

    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }

    function getBallotStatus() external view returns (
        uint256 totalWhitelistedVoters,
        uint256 totalVotesCast,
        bool isVotingOpen,
        bool isDelegationAllowed,
        uint256 maxAllowedVotes
    ) {
        return (
            totalVoters,
            votesCount,
            votingOpen,
            allowDelegation,
            maxVotes
        );
    }
}