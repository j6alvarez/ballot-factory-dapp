// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./Ballot.sol";

contract BallotFactory {
    struct BallotInfo {
        address ballotAddress;
        string description;
        address owner;
        uint256 maxVotes;
        bool allowDelegation;
        uint256 proposalCount;
        bool isActive;
    }

    BallotInfo[] public ballots;
    mapping(address => BallotInfo[]) public userBallots;
    
    event BallotCreated(
        address indexed ballotAddress, 
        string description, 
        address indexed owner, 
        uint256 maxVotes, 
        bool allowDelegation,
        uint256 proposalCount
    );

    function createBallot(
        bytes32[] memory proposalNames,
        string memory description,
        uint256 maxVotes,
        bool allowDelegation
    ) external returns (address) {
        require(proposalNames.length > 0, "Must provide at least one proposal");
        require(proposalNames.length <= 5, "Maximum 5 proposals allowed");
        
        Ballot newBallot = new Ballot(
            proposalNames,
            maxVotes,
            allowDelegation,
            msg.sender
        );
        
        address ballotAddress = address(newBallot);
        
        BallotInfo memory ballotInfo = BallotInfo({
            ballotAddress: ballotAddress,
            description: description,
            owner: msg.sender,
            maxVotes: maxVotes,
            allowDelegation: allowDelegation,
            proposalCount: proposalNames.length,
            isActive: true
        });
        
        ballots.push(ballotInfo);
        userBallots[msg.sender].push(ballotInfo);
        
        emit BallotCreated(
            ballotAddress, 
            description, 
            msg.sender, 
            maxVotes, 
            allowDelegation,
            proposalNames.length
        );
        
        return ballotAddress;
    }
    
    function getAllBallots() external view returns (BallotInfo[] memory) {
        return ballots;
    }
    
    function getUserBallots(address user) external view returns (BallotInfo[] memory) {
        return userBallots[user];
    }
    
    function getActiveBallots() external view returns (BallotInfo[] memory) {
        uint256 activeCount = 0;
        
        // First count active ballots
        for (uint256 i = 0; i < ballots.length; i++) {
            if (ballots[i].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active ballots
        BallotInfo[] memory activeBallots = new BallotInfo[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < ballots.length; i++) {
            if (ballots[i].isActive) {
                activeBallots[index] = ballots[i];
                index++;
            }
        }
        
        return activeBallots;
    }
    
    function getBallotStatus(uint256 ballotIndex) external view returns (
        bool isActive,
        uint256 totalVoters,
        uint256 votesCount,
        bool votingOpen,
        bool allowDelegation,
        uint256 maxVotes
    ) {
        require(ballotIndex < ballots.length, "Invalid ballot index");
        
        BallotInfo memory ballot = ballots[ballotIndex];
        Ballot ballotContract = Ballot(ballot.ballotAddress);
        
        (
            totalVoters,
            votesCount,
            votingOpen,
            allowDelegation,
            maxVotes
        ) = ballotContract.getBallotStatus();
        
        return (
            ballot.isActive,
            totalVoters,
            votesCount,
            votingOpen,
            allowDelegation,
            maxVotes
        );
    }
}