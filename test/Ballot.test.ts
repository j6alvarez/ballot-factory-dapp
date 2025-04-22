import { expect } from "chai";
import { viem } from "hardhat";
import { stringToHex } from "viem";

describe("Ballot Contract", function () {
  async function deployBallot() {
    const [owner, voter1, voter2, voter3, voter4] =
      await viem.getWalletClients();

    // Convert proposal names to bytes32[]
    const proposalNames = [
      stringToHex("Proposal 1", { size: 32 }),
      stringToHex("Proposal 2", { size: 32 }),
      stringToHex("Proposal 3", { size: 32 }),
    ];

    const maxVotes = 100n;
    const allowDelegation = true;

    const ballot = await viem.deployContract("Ballot", [
      proposalNames,
      maxVotes,
      allowDelegation,
      owner.account.address,
    ]);

    return { ballot, owner, voter1, voter2, voter3, voter4, proposalNames };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { ballot, owner } = await deployBallot();

      // Convert both addresses to lowercase for case-insensitive comparison
      const contractOwner = (await ballot.read.owner()).toLowerCase();
      const expectedOwner = owner.account.address.toLowerCase();

      expect(contractOwner).to.equal(expectedOwner);
    });

    it("Should initialize proposals correctly", async function () {
      const { ballot, proposalNames } = await deployBallot();

      expect(await ballot.read.getProposalCount()).to.equal(3n);

      // Check each proposal
      for (let i = 0; i < 3; i++) {
        const proposal = await ballot.read.proposals([BigInt(i)]);
        expect(proposal[0]).to.equal(proposalNames[i]); // name
        expect(proposal[1]).to.equal(0n); // voteCount
      }
    });

    it("Should initialize voting state correctly", async function () {
      const { ballot } = await deployBallot();

      const ballotStatus = await ballot.read.getBallotStatus();
      expect(ballotStatus[0]).to.equal(0n); // totalVoters
      expect(ballotStatus[1]).to.equal(0n); // votesCount
      expect(ballotStatus[2]).to.equal(true); // votingOpen
      expect(ballotStatus[3]).to.equal(true); // allowDelegation
      expect(ballotStatus[4]).to.equal(100n); // maxVotes
    });
  });

  describe("Voter Whitelisting", function () {
    it("Should whitelist a single voter", async function () {
      const { ballot, owner, voter1 } = await deployBallot();

      // Initial state
      expect(await ballot.read.totalVoters()).to.equal(0n);

      // Whitelist voter1
      await ballot.write.whitelistVoter([voter1.account.address], {
        account: owner.account,
      });

      // Check voter status
      const voter1Data = await ballot.read.voters([voter1.account.address]);
      expect(voter1Data[1]).to.equal(true); // isWhitelisted
      expect(voter1Data[4]).to.equal(1n); // weight

      // Check total voters
      expect(await ballot.read.totalVoters()).to.equal(1n);
    });

    it("Should whitelist multiple voters", async function () {
      const { ballot, owner, voter1, voter2, voter3 } = await deployBallot();

      // Whitelist multiple voters
      await ballot.write.whitelistVoters(
        [
          [
            voter1.account.address,
            voter2.account.address,
            voter3.account.address,
          ],
        ],
        { account: owner.account }
      );

      // Check voter status for all voters
      for (const voter of [voter1, voter2, voter3]) {
        const voterData = await ballot.read.voters([voter.account.address]);
        expect(voterData[1]).to.equal(true); // isWhitelisted
        expect(voterData[4]).to.equal(1n); // weight
      }

      // Check total voters
      expect(await ballot.read.totalVoters()).to.equal(3n);
    });

    it("Should not allow non-owner to whitelist voters", async function () {
      const { ballot, voter1, voter2 } = await deployBallot();

      // Try to whitelist as non-owner (should fail)
      await expect(
        ballot.write.whitelistVoter([voter2.account.address], {
          account: voter1.account,
        })
      ).to.be.rejectedWith("Only admin can call this function");
    });

    it("Should not whitelist already whitelisted voter", async function () {
      const { ballot, owner, voter1 } = await deployBallot();

      // Whitelist first time (should succeed)
      await ballot.write.whitelistVoter([voter1.account.address], {
        account: owner.account,
      });

      // Try to whitelist again (should fail)
      await expect(
        ballot.write.whitelistVoter([voter1.account.address], {
          account: owner.account,
        })
      ).to.be.rejectedWith("Voter already whitelisted");
    });

    it("Should respect max votes limit when whitelisting", async function () {
      const { ballot, owner, voter1, voter2, voter3, voter4 } =
        await deployBallot();

      // Deploy a ballot with small max votes limit
      const smallBallot = await viem.deployContract("Ballot", [
        [stringToHex("Test", { size: 32 })], // proposal
        2n, // maxVotes (only 2 allowed)
        true, // allowDelegation
        owner.account.address,
      ]);

      // Whitelist up to the limit
      await smallBallot.write.whitelistVoters(
        [[voter1.account.address, voter2.account.address]],
        { account: owner.account }
      );

      // Try to whitelist one more (should fail)
      await expect(
        smallBallot.write.whitelistVoter([voter3.account.address], {
          account: owner.account,
        })
      ).to.be.rejectedWith("Maximum number of voters reached");

      // Check total voters is still at max
      expect(await smallBallot.read.totalVoters()).to.equal(2n);
    });
  });

  describe("Voting", function () {
    it("Should allow whitelisted voter to vote", async function () {
      const { ballot, owner, voter1 } = await deployBallot();

      // Whitelist voter
      await ballot.write.whitelistVoter([voter1.account.address], {
        account: owner.account,
      });

      // Cast vote
      await ballot.write.vote([0n], { account: voter1.account });

      // Check vote was recorded
      const voter1Data = await ballot.read.voters([voter1.account.address]);
      expect(voter1Data[0]).to.equal(true); // hasVoted
      expect(voter1Data[2]).to.equal(0n); // votedProposalId

      // Check proposal vote count
      const proposal = await ballot.read.proposals([0n]);
      expect(proposal[1]).to.equal(1n); // voteCount

      // Check total votes
      expect(await ballot.read.votesCount()).to.equal(1n);
    });

    it("Should not allow non-whitelisted voter to vote", async function () {
      const { ballot, voter1 } = await deployBallot();

      // Try to vote without being whitelisted
      await expect(
        ballot.write.vote([0n], { account: voter1.account })
      ).to.be.rejectedWith("Not whitelisted to vote");
    });

    it("Should not allow voting twice", async function () {
      const { ballot, owner, voter1 } = await deployBallot();

      // Whitelist voter
      await ballot.write.whitelistVoter([voter1.account.address], {
        account: owner.account,
      });

      // Cast vote first time
      await ballot.write.vote([0n], { account: voter1.account });

      // Try to vote again
      await expect(
        ballot.write.vote([1n], { account: voter1.account })
      ).to.be.rejectedWith("Already voted");
    });

    it("Should not allow voting on invalid proposal", async function () {
      const { ballot, owner, voter1 } = await deployBallot();

      // Whitelist voter
      await ballot.write.whitelistVoter([voter1.account.address], {
        account: owner.account,
      });

      // Try to vote for invalid proposal
      await expect(
        ballot.write.vote([99n], { account: voter1.account })
      ).to.be.rejectedWith("Invalid proposal");
    });

    it("Should not allow voting when voting is closed", async function () {
      const { ballot, owner, voter1 } = await deployBallot();

      // Whitelist voter
      await ballot.write.whitelistVoter([voter1.account.address], {
        account: owner.account,
      });

      // Close voting
      await ballot.write.setVotingState([false], { account: owner.account });

      // Try to vote when closed
      await expect(
        ballot.write.vote([0n], { account: voter1.account })
      ).to.be.rejectedWith("Voting is not open");
    });
  });

  describe("Delegation", function () {
    it("Should allow delegation to another voter", async function () {
      const { ballot, owner, voter1, voter2 } = await deployBallot();

      // Whitelist both voters
      await ballot.write.whitelistVoters(
        [[voter1.account.address, voter2.account.address]],
        { account: owner.account }
      );

      // Delegate from voter1 to voter2
      await ballot.write.delegate([voter2.account.address], {
        account: voter1.account,
      });

      // Check voter1 state
      const voter1Data = await ballot.read.voters([voter1.account.address]);
      expect(voter1Data[0]).to.equal(true); // hasVoted
      expect(voter1Data[3]?.toLowerCase()).to.equal(voter2.account.address); // delegate

      // Check voter2 has increased weight
      const voter2Data = await ballot.read.voters([voter2.account.address]);
      expect(voter2Data[4]).to.equal(2n); // weight (1 + 1)
    });

    it("Should add weight to proposal if delegate already voted", async function () {
      const { ballot, owner, voter1, voter2 } = await deployBallot();

      // Whitelist both voters
      await ballot.write.whitelistVoters(
        [[voter1.account.address, voter2.account.address]],
        { account: owner.account }
      );

      // Voter2 votes first
      await ballot.write.vote([1n], { account: voter2.account });

      // Delegate from voter1 to voter2
      await ballot.write.delegate([voter2.account.address], {
        account: voter1.account,
      });

      // Check proposal vote count (should include delegate's weight)
      const proposal = await ballot.read.proposals([1n]);
      expect(proposal[1]).to.equal(2n); // voteCount (1 + 1)
    });

    it("Should not allow delegation in ballot with delegation disabled", async function () {
      const [owner, voter1, voter2] = await viem.getWalletClients();

      // Deploy ballot with delegation disabled
      const noDelegationBallot = await viem.deployContract("Ballot", [
        [stringToHex("Test", { size: 32 })], // proposal
        100n, // maxVotes
        false, // allowDelegation disabled
        owner.account.address,
      ]);

      // Whitelist both voters
      await noDelegationBallot.write.whitelistVoters(
        [[voter1.account.address, voter2.account.address]],
        { account: owner.account }
      );

      // Try to delegate (should fail)
      await expect(
        noDelegationBallot.write.delegate([voter2.account.address], {
          account: voter1.account,
        })
      ).to.be.rejectedWith("Delegation not allowed in this ballot");
    });

    it("Should not allow delegation to self", async function () {
      const { ballot, owner, voter1 } = await deployBallot();

      // Whitelist voter
      await ballot.write.whitelistVoter([voter1.account.address], {
        account: owner.account,
      });

      // Try to delegate to self
      await expect(
        ballot.write.delegate([voter1.account.address], {
          account: voter1.account,
        })
      ).to.be.rejectedWith("Cannot delegate to yourself");
    });

    it("Should not allow delegation after voting", async function () {
      const { ballot, owner, voter1, voter2 } = await deployBallot();

      // Whitelist both voters
      await ballot.write.whitelistVoters(
        [[voter1.account.address, voter2.account.address]],
        { account: owner.account }
      );

      // Voter1 votes
      await ballot.write.vote([0n], { account: voter1.account });

      // Try to delegate after voting
      await expect(
        ballot.write.delegate([voter2.account.address], {
          account: voter1.account,
        })
      ).to.be.rejectedWith("Already voted");
    });

    it("Should handle delegation chains correctly", async function () {
      const { ballot, owner, voter1, voter2, voter3 } = await deployBallot();

      // Whitelist all voters
      await ballot.write.whitelistVoters(
        [
          [
            voter1.account.address,
            voter2.account.address,
            voter3.account.address,
          ],
        ],
        { account: owner.account }
      );

      // Create a delegation chain: voter1 -> voter2 -> voter3
      await ballot.write.delegate([voter2.account.address], {
        account: voter1.account,
      });
      await ballot.write.delegate([voter3.account.address], {
        account: voter2.account,
      });

      // Check delegation chain
      const voter1Data = await ballot.read.voters([voter1.account.address]);
      expect(voter1Data[3]?.toLowerCase()).to.equal(voter2.account.address);

      const voter2Data = await ballot.read.voters([voter2.account.address]);
      expect(voter2Data[3]?.toLowerCase()).to.equal(voter3.account.address);

      // Check that voter3 has the combined weight
      const voter3Data = await ballot.read.voters([voter3.account.address]);
      expect(voter3Data[4]).to.equal(3n); // weight (1 + 1 + 1)

      // Now let voter3 vote
      await ballot.write.vote([0n], { account: voter3.account });

      // Check proposal vote count (should include all weights)
      const proposal = await ballot.read.proposals([0n]);
      expect(proposal[1]).to.equal(3n); // voteCount (combined weights)
    });

    it("Should prevent delegation loops", async function () {
      const { ballot, owner, voter1, voter2, voter3 } = await deployBallot();

      // Whitelist all voters
      await ballot.write.whitelistVoters(
        [
          [
            voter1.account.address,
            voter2.account.address,
            voter3.account.address,
          ],
        ],
        { account: owner.account }
      );

      // Create a potential loop: voter1 -> voter2 -> voter3 -> (try) voter1
      await ballot.write.delegate([voter2.account.address], {
        account: voter1.account,
      });
      await ballot.write.delegate([voter3.account.address], {
        account: voter2.account,
      });

      // Try to close the loop (should fail)
      await expect(
        ballot.write.delegate([voter1.account.address], {
          account: voter3.account,
        })
      ).to.be.rejectedWith("Loop in delegation detected");
    });
  });

  describe("Winner Determination", function () {
    it("Should correctly determine the winner", async function () {
      const { ballot, owner, voter1, voter2, voter3 } = await deployBallot();

      // Whitelist voters
      await ballot.write.whitelistVoters(
        [
          [
            voter1.account.address,
            voter2.account.address,
            voter3.account.address,
          ],
        ],
        { account: owner.account }
      );

      // Cast votes for different proposals
      await ballot.write.vote([0n], { account: voter1.account }); // 1 vote for proposal 0
      await ballot.write.vote([1n], { account: voter2.account }); // 1 vote for proposal 1
      await ballot.write.vote([1n], { account: voter3.account }); // 1 vote for proposal 1

      // Check winning proposal (should be proposal 1 with 2 votes)
      expect(await ballot.read.winningProposal()).to.equal(1n);

      // Check winner name
      const winnerName = await ballot.read.winnerName();
      expect(winnerName).to.equal(stringToHex("Proposal 2", { size: 32 }));
    });

    it("Should handle ties by selecting the first proposal", async function () {
      const { ballot, owner, voter1, voter2 } = await deployBallot();

      // Whitelist voters
      await ballot.write.whitelistVoters(
        [[voter1.account.address, voter2.account.address]],
        { account: owner.account }
      );

      // Cast votes for different proposals
      await ballot.write.vote([0n], { account: voter1.account }); // 1 vote for proposal 0
      await ballot.write.vote([1n], { account: voter2.account }); // 1 vote for proposal 1

      // In case of a tie, the first encountered winning proposal is returned
      // Since the loop iterates from 0, proposal 0 should win
      expect(await ballot.read.winningProposal()).to.equal(0n);
    });
  });

  describe("Voting Control", function () {
    it("Should allow owner to close and reopen voting", async function () {
      const { ballot, owner, voter1 } = await deployBallot();

      // Whitelist voter
      await ballot.write.whitelistVoter([voter1.account.address], {
        account: owner.account,
      });

      // Close voting
      await ballot.write.setVotingState([false], { account: owner.account });

      // Check voting is closed
      expect((await ballot.read.getBallotStatus())[2]).to.equal(false);

      // Try to vote (should fail)
      await expect(
        ballot.write.vote([0n], { account: voter1.account })
      ).to.be.rejectedWith("Voting is not open");

      // Reopen voting
      await ballot.write.setVotingState([true], { account: owner.account });

      // Check voting is open
      expect((await ballot.read.getBallotStatus())[2]).to.equal(true);

      // Try to vote again (should succeed)
      await ballot.write.vote([0n], { account: voter1.account });

      // Check vote was counted
      expect(await ballot.read.votesCount()).to.equal(1n);
    });

    it("Should not allow non-owner to control voting state", async function () {
      const { ballot, voter1 } = await deployBallot();

      // Try to close voting as non-owner
      await expect(
        ballot.write.setVotingState([false], { account: voter1.account })
      ).to.be.rejectedWith("Only owner can call this function");
    });

    it("Should allow admin to close and reopen voting", async function () {
      const { ballot, owner, voter1, voter2 } = await deployBallot();

      // Add voter2 as admin
      await ballot.write.addAdmin([voter2.account.address], {
        account: owner.account,
      });

      // Verify voter2 is now an admin
      expect(await ballot.read.isAdmin([voter2.account.address])).to.equal(
        true
      );

      // Whitelist voter
      await ballot.write.whitelistVoter([voter1.account.address], {
        account: voter2.account, // Using admin privileges
      });

      // Close voting as admin (not owner)
      await ballot.write.setVotingState([false], { account: voter2.account });

      // Check voting is closed
      expect((await ballot.read.getBallotStatus())[2]).to.equal(false);

      // Reopen voting as admin
      await ballot.write.setVotingState([true], { account: voter2.account });

      // Check voting is open
      expect((await ballot.read.getBallotStatus())[2]).to.equal(true);

      // Voter1 should be able to vote now
      await ballot.write.vote([0n], { account: voter1.account });

      // Check vote was counted
      expect(await ballot.read.votesCount()).to.equal(1n);
    });
  });
});
