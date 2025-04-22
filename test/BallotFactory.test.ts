import { expect } from "chai";
import { viem } from "hardhat";
import { stringToHex } from "viem";

describe("BallotFactory Contract", function () {
  // Helper function to deploy BallotFactory and setup wallets
  async function deployBallotFactory() {
    const [owner, user1, user2, user3] = await viem.getWalletClients();
    const ballotFactory = await viem.deployContract("BallotFactory", []);
    return { ballotFactory, owner, user1, user2, user3 };
  }

  // Helper function to create a test ballot
  async function createTestBallot(
    ballotFactory: any,
    walletClient: any,
    proposalNames: string[] = ["Proposal 1", "Proposal 2", "Proposal 3"],
    description: string = "Test Ballot",
    maxVotes: bigint = 100n,
    allowDelegation: boolean = true
  ) {
    // Convert proposal names to bytes32[]
    const proposalNamesBytes32 = proposalNames.map((name) =>
      stringToHex(name, { size: 32 })
    );

    // Create the ballot
    const tx = await ballotFactory.write.createBallot(
      [proposalNamesBytes32, description, maxVotes, allowDelegation],
      { account: walletClient.account }
    );

    // Get all ballots to find the new one
    const allBallots = await ballotFactory.read.getAllBallots();

    // Find the latest ballot (should be the one we just created)
    const newBallotInfo = allBallots[allBallots.length - 1];

    return {
      tx,
      newBallotInfo,
    };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { ballotFactory } = await deployBallotFactory();

      // Simple check that the contract exists
      expect(await ballotFactory.read.getAllBallots()).to.be.an("array");
    });
  });

  describe("Ballot Creation", function () {
    it("Should create a new ballot with correct parameters", async function () {
      const { ballotFactory, owner } = await deployBallotFactory();

      const description = "Test Ballot";
      const maxVotes = 100n;
      const allowDelegation = true;
      const proposalNames = ["Proposal 1", "Proposal 2", "Proposal 3"];

      const { newBallotInfo } = await createTestBallot(
        ballotFactory,
        owner,
        proposalNames,
        description,
        maxVotes,
        allowDelegation
      );

      // Verify ballot info
      expect(newBallotInfo.description).to.equal(description);
      expect(newBallotInfo.owner.toLowerCase()).to.equal(
        owner.account.address.toLowerCase()
      );
      expect(newBallotInfo.maxVotes).to.equal(maxVotes);
      expect(newBallotInfo.allowDelegation).to.equal(allowDelegation);
      expect(newBallotInfo.proposalCount).to.equal(
        BigInt(proposalNames.length)
      );
      expect(newBallotInfo.isActive).to.equal(true);
    });

    it("Should not create a ballot with no proposals", async function () {
      const { ballotFactory, owner } = await deployBallotFactory();

      // Try to create a ballot with empty proposals array
      await expect(
        ballotFactory.write.createBallot([[], "Empty Ballot", 100n, true], {
          account: owner.account,
        })
      ).to.be.rejectedWith("Must provide at least one proposal");
    });

    it("Should not create a ballot with more than 5 proposals", async function () {
      const { ballotFactory, owner } = await deployBallotFactory();

      // Create an array with 6 proposals
      const proposalNames = Array(6)
        .fill(0)
        .map((_, i) => stringToHex(`Proposal ${i + 1}`, { size: 32 }));

      // Try to create a ballot with too many proposals
      await expect(
        ballotFactory.write.createBallot(
          [proposalNames, "Too Many Proposals", 100n, true],
          { account: owner.account }
        )
      ).to.be.rejectedWith("Maximum 5 proposals allowed");
    });

    it("Should emit BallotCreated event with correct parameters", async function () {
      const { ballotFactory, owner } = await deployBallotFactory();

      const description = "Event Test Ballot";
      const maxVotes = 50n;
      const allowDelegation = false;
      const proposalNames = ["Proposal A", "Proposal B"];
      const proposalNamesBytes32 = proposalNames.map((name) =>
        stringToHex(name, { size: 32 })
      );

      // Create the ballot and capture the transaction
      const tx = await ballotFactory.write.createBallot(
        [proposalNamesBytes32, description, maxVotes, allowDelegation],
        { account: owner.account }
      );

      // Get transaction receipt to check events
      const publicClient = await viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });

      // Verify event was emitted
      const logs = receipt.logs;
      expect(logs.length).to.be.greaterThan(0);
    });
  });

  describe("Ballot Tracking", function () {
    it("Should track all created ballots", async function () {
      const { ballotFactory, owner } = await deployBallotFactory();

      // Initially there should be no ballots
      const initialBallots = await ballotFactory.read.getAllBallots();
      expect(initialBallots.length).to.equal(0);

      // Create first ballot
      await createTestBallot(
        ballotFactory,
        owner,
        ["A1", "A2"],
        "Ballot A",
        100n,
        true
      );

      // Should now have 1 ballot
      const afterFirstBallot = await ballotFactory.read.getAllBallots();
      expect(afterFirstBallot.length).to.equal(1);

      // Create second ballot
      await createTestBallot(
        ballotFactory,
        owner,
        ["B1", "B2"],
        "Ballot B",
        200n,
        false
      );

      // Should now have 2 ballots
      const afterSecondBallot = await ballotFactory.read.getAllBallots();
      expect(afterSecondBallot.length).to.equal(2);
    });

    it("Should track ballots by user", async function () {
      const { ballotFactory, owner, user1, user2 } =
        await deployBallotFactory();

      // Create ballot as owner
      await createTestBallot(
        ballotFactory,
        owner,
        ["Owner Proposal"],
        "Owner Ballot",
        100n,
        true
      );

      // Create ballot as user1
      await createTestBallot(
        ballotFactory,
        user1,
        ["User1 Proposal"],
        "User1 Ballot",
        50n,
        false
      );

      // Create another ballot as user1
      await createTestBallot(
        ballotFactory,
        user1,
        ["User1 Second Proposal"],
        "User1 Second Ballot",
        75n,
        true
      );

      // Check owner's ballots
      const ownerBallots = await ballotFactory.read.getUserBallots([
        owner.account.address,
      ]);
      expect(ownerBallots.length).to.equal(1);
      expect(ownerBallots[0].description).to.equal("Owner Ballot");

      // Check user1's ballots
      const user1Ballots = await ballotFactory.read.getUserBallots([
        user1.account.address,
      ]);
      expect(user1Ballots.length).to.equal(2);
      expect(user1Ballots[0].description).to.equal("User1 Ballot");
      expect(user1Ballots[1].description).to.equal("User1 Second Ballot");

      // Check user2's ballots (should be empty)
      const user2Ballots = await ballotFactory.read.getUserBallots([
        user2.account.address,
      ]);
      expect(user2Ballots.length).to.equal(0);
    });

    it("Should track active ballots", async function () {
      const { ballotFactory, owner } = await deployBallotFactory();

      // Initially there should be no active ballots
      const initialActiveBallots = await ballotFactory.read.getActiveBallots();
      expect(initialActiveBallots.length).to.equal(0);

      // Create two ballots
      await createTestBallot(
        ballotFactory,
        owner,
        ["A1", "A2"],
        "Active Ballot 1",
        100n,
        true
      );
      await createTestBallot(
        ballotFactory,
        owner,
        ["B1", "B2"],
        "Active Ballot 2",
        200n,
        false
      );

      // Get all active ballots
      const activeBallots = await ballotFactory.read.getActiveBallots();
      expect(activeBallots.length).to.equal(2);
    });
  });

  describe("Ballot Status", function () {
    it("Should get ballot status correctly", async function () {
      const { ballotFactory, owner } = await deployBallotFactory();

      // Create a test ballot
      await createTestBallot(ballotFactory, owner);

      // Get status of the first ballot (index 0)
      const status = await ballotFactory.read.getBallotStatus([0n]);

      // Verify status format
      expect(status).to.be.an("array");
      // The ballot should be active
      expect(status[0]).to.equal(true);
    });

    it("Should not get status of invalid ballot index", async function () {
      const { ballotFactory } = await deployBallotFactory();

      // Try to get status of non-existent ballot
      await expect(
        ballotFactory.read.getBallotStatus([999n])
      ).to.be.rejectedWith("Invalid ballot index");
    });
  });

  describe("Integration with Ballot Contract", function () {
    it("Should create a ballot that can be interacted with", async function () {
      const { ballotFactory, owner, user1 } = await deployBallotFactory();

      // Create a test ballot
      const { newBallotInfo } = await createTestBallot(
        ballotFactory,
        owner,
        ["Proposal X", "Proposal Y"],
        "Interactive Ballot",
        100n,
        true
      );

      // Create an instance of the Ballot contract
      const ballotContract = await viem.getContractAt(
        "Ballot",
        newBallotInfo.ballotAddress
      );

      // Test interaction: whitelist a voter
      await ballotContract.write.whitelistVoter([user1.account.address], {
        account: owner.account,
      });

      // Verify voter was whitelisted
      const voterData = await ballotContract.read.voters([
        user1.account.address,
      ]);
      expect(voterData[1]).to.equal(true); // isWhitelisted

      // Verify total voters increased
      expect(await ballotContract.read.totalVoters()).to.equal(1n);

      // Now let the voter vote
      await ballotContract.write.vote(
        [0n], // vote for first proposal
        { account: user1.account }
      );

      // Verify vote was counted
      const proposal = await ballotContract.read.proposals([0n]);
      expect(proposal[1]).to.equal(1n); // voteCount
    });

    it("Should allow accessing proposal information from created ballot", async function () {
      const { ballotFactory, owner } = await deployBallotFactory();

      // Create a ballot with specific proposals
      const proposalNames = ["Apple", "Banana", "Cherry"];
      const { newBallotInfo } = await createTestBallot(
        ballotFactory,
        owner,
        proposalNames
      );

      // Access the created ballot
      const ballotContract = await viem.getContractAt(
        "Ballot",
        newBallotInfo.ballotAddress
      );

      // Check proposal count matches
      expect(await ballotContract.read.getProposalCount()).to.equal(3n);

      // Check each proposal name
      for (let i = 0; i < proposalNames.length; i++) {
        const proposal = await ballotContract.read.proposals([BigInt(i)]);
        expect(proposal[0]).to.equal(
          stringToHex(proposalNames[i], { size: 32 })
        );
      }
    });
  });

  describe("Multiple Ballots Management", function () {
    it("Should handle multiple ballots with different configurations", async function () {
      const { ballotFactory, owner, user1, user2 } =
        await deployBallotFactory();

      // Create 3 different ballots
      const ballot1Info = (
        await createTestBallot(
          ballotFactory,
          owner,
          ["Yes", "No"],
          "Simple Vote",
          50n,
          false // No delegation
        )
      ).newBallotInfo;

      const ballot2Info = (
        await createTestBallot(
          ballotFactory,
          user1,
          ["Red", "Blue", "Green"],
          "Color Vote",
          100n,
          true // Allow delegation
        )
      ).newBallotInfo;

      const ballot3Info = (
        await createTestBallot(
          ballotFactory,
          owner,
          ["Option A", "Option B", "Option C", "Option D"],
          "Multiple Choice",
          200n,
          true
        )
      ).newBallotInfo;

      // Verify all ballots are tracked
      const allBallots = await ballotFactory.read.getAllBallots();
      expect(allBallots.length).to.equal(3);

      // Check owner's ballots
      const ownerBallots = await ballotFactory.read.getUserBallots([
        owner.account.address,
      ]);
      expect(ownerBallots.length).to.equal(2);

      // Create Ballot contract instances
      const ballot1 = await viem.getContractAt(
        "Ballot",
        ballot1Info.ballotAddress
      );
      const ballot2 = await viem.getContractAt(
        "Ballot",
        ballot2Info.ballotAddress
      );

      // Verify delegation settings
      expect((await ballot1.read.getBallotStatus())[3]).to.equal(false);
      expect((await ballot2.read.getBallotStatus())[3]).to.equal(true);

      // Whitelist user2 in both ballots
      await ballot1.write.whitelistVoter([user2.account.address], {
        account: owner.account,
      });
      await ballot2.write.whitelistVoter([user2.account.address], {
        account: user1.account,
      });

      // User2 votes in both ballots
      await ballot1.write.vote([0n], { account: user2.account }); // Vote "Yes" in ballot1
      await ballot2.write.vote([1n], { account: user2.account }); // Vote "Blue" in ballot2

      // Verify votes were counted
      const proposal1 = await ballot1.read.proposals([0n]);
      const proposal2 = await ballot2.read.proposals([1n]);
      expect(proposal1[1]).to.equal(1n);
      expect(proposal2[1]).to.equal(1n);
    });
  });
});
