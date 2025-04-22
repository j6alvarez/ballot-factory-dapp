import { viem } from "hardhat";
import { formatEther, parseEther, stringToHex } from "viem";

async function main() {
  console.log("=== Testing Multiple Ballots with Different Owners ===\n");

  const publicClient = await viem.getPublicClient();
  const [deployer, owner1, owner2, voter1, voter2, voter3, voter4] =
    await viem.getWalletClients();

  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Owner1: ${owner1.account.address}`);
  console.log(`Owner2: ${owner2.account.address}`);
  console.log(`Voter1: ${voter1.account.address}`);
  console.log(`Voter2: ${voter2.account.address}`);
  console.log(`Voter3: ${voter3.account.address}`);
  console.log(`Voter4: ${voter4.account.address}\n`);

  // Deploy BallotFactory contract
  console.log("Deploying BallotFactory contract...");
  const ballotFactory = await viem.deployContract("BallotFactory");
  console.log(`BallotFactory deployed at: ${ballotFactory.address}\n`);

  // ========== FIRST BALLOT (Owner1) ==========
  console.log("========== CREATING FIRST BALLOT (Owner1) ==========");
  console.log(
    "Creating ballot with 3 proposals, max 50 votes, delegation allowed"
  );

  // Prepare proposals for first ballot
  const ballot1Proposals = [
    stringToHex("Increase Budget", { size: 32 }),
    stringToHex("Decrease Budget", { size: 32 }),
    stringToHex("Maintain Budget", { size: 32 }),
  ];

  // Create first ballot (Owner1)
  const createTx1 = await ballotFactory.write.createBallot(
    [
      ballot1Proposals,
      "Budget Decision 2025",
      50n, // maxVotes
      true, // allowDelegation
    ],
    { account: owner1.account }
  );

  const receipt1 = await publicClient.waitForTransactionReceipt({
    hash: createTx1,
  });
  console.log(`Ballot 1 created: ${receipt1.transactionHash}\n`);

  // Get the first ballot details
  const ownerBallots1 = await ballotFactory.read.getUserBallots([
    owner1.account.address,
  ]);
  const ballot1Info = ownerBallots1[0];
  console.log("Ballot 1 Info:");
  console.log(`- Address: ${ballot1Info.ballotAddress}`);
  console.log(`- Description: ${ballot1Info.description}`);
  console.log(`- Owner: ${ballot1Info.owner}`);
  console.log(`- Max votes: ${ballot1Info.maxVotes}`);
  console.log(`- Allow delegation: ${ballot1Info.allowDelegation}`);
  console.log(`- Proposal count: ${ballot1Info.proposalCount}`);
  console.log(`- Is active: ${ballot1Info.isActive}\n`);

  // Get the first ballot contract
  const ballot1 = await viem.getContractAt("Ballot", ballot1Info.ballotAddress);

  // Whitelist voters for first ballot
  console.log("Whitelisting voters for Ballot 1...");
  await ballot1.write.whitelistVoters(
    [[voter1.account.address, voter2.account.address]],
    { account: owner1.account }
  );
  console.log("Voters 1 and 2 whitelisted for Ballot 1\n");

  // Cast votes in first ballot
  console.log("Casting votes in Ballot 1...");
  await ballot1.write.vote([0n], { account: voter1.account });
  console.log("Voter1 voted for proposal 0 (Increase Budget)");

  await ballot1.write.vote([2n], { account: voter2.account });
  console.log("Voter2 voted for proposal 2 (Maintain Budget)\n");

  // Check ballot 1 results
  console.log("Checking Ballot 1 results...");
  const ballot1Status = await ballot1.read.getBallotStatus();
  console.log(`- Total voters: ${ballot1Status[0]}`);
  console.log(`- Total votes cast: ${ballot1Status[1]}`);

  // Get vote counts for each proposal
  for (let i = 0; i < 3; i++) {
    const proposal = await ballot1.read.proposals([BigInt(i)]);
    console.log(`- Proposal ${i} votes: ${proposal[1]}`);
  }

  const winningId1 = await ballot1.read.winningProposal();
  const winnerName1 = await ballot1.read.winnerName();
  const winnerName1String = Buffer.from(winnerName1.slice(2), "hex")
    .toString("utf8")
    .replace(/\0/g, "");
  console.log(`- Winning proposal: ${winnerName1String} (ID: ${winningId1})\n`);

  // ========== SECOND BALLOT (Owner2) ==========
  console.log("========== CREATING SECOND BALLOT (Owner2) ==========");
  console.log("Creating ballot with 2 proposals, max 30 votes, no delegation");

  // Prepare proposals for second ballot
  const ballot2Proposals = [
    stringToHex("Virtual Conference", { size: 32 }),
    stringToHex("In-Person Conference", { size: 32 }),
  ];

  // Create second ballot (Owner2)
  const createTx2 = await ballotFactory.write.createBallot(
    [
      ballot2Proposals,
      "Conference Format Decision",
      30n, // maxVotes
      false, // allowDelegation (not allowed)
    ],
    { account: owner2.account }
  );

  const receipt2 = await publicClient.waitForTransactionReceipt({
    hash: createTx2,
  });
  console.log(`Ballot 2 created: ${receipt2.transactionHash}\n`);

  // Get the second ballot details
  const ownerBallots2 = await ballotFactory.read.getUserBallots([
    owner2.account.address,
  ]);
  const ballot2Info = ownerBallots2[0];
  console.log("Ballot 2 Info:");
  console.log(`- Address: ${ballot2Info.ballotAddress}`);
  console.log(`- Description: ${ballot2Info.description}`);
  console.log(`- Owner: ${ballot2Info.owner}`);
  console.log(`- Max votes: ${ballot2Info.maxVotes}`);
  console.log(`- Allow delegation: ${ballot2Info.allowDelegation}`);
  console.log(`- Proposal count: ${ballot2Info.proposalCount}`);
  console.log(`- Is active: ${ballot2Info.isActive}\n`);

  // Get the second ballot contract
  const ballot2 = await viem.getContractAt("Ballot", ballot2Info.ballotAddress);

  // Whitelist voters for second ballot
  console.log("Whitelisting voters for Ballot 2...");
  await ballot2.write.whitelistVoters(
    [[voter3.account.address, voter4.account.address]],
    { account: owner2.account }
  );
  console.log("Voters 3 and 4 whitelisted for Ballot 2\n");

  // Cast votes in second ballot
  console.log("Casting votes in Ballot 2...");
  await ballot2.write.vote([0n], { account: voter3.account });
  console.log("Voter3 voted for proposal 0 (Virtual Conference)");

  await ballot2.write.vote([1n], { account: voter4.account });
  console.log("Voter4 voted for proposal 1 (In-Person Conference)\n");

  // Try delegation (which should fail since it's not allowed)
  console.log("Testing delegation in Ballot 2 (should fail)...");
  try {
    await ballot2.write.delegate([voter3.account.address], {
      account: voter2.account,
    });
    console.log("ERROR: Delegation succeeded when it should have failed");
  } catch (error) {
    console.log(
      "Delegation failed as expected: delegation not allowed in this ballot"
    );
  }

  // Check ballot 2 results
  console.log("\nChecking Ballot 2 results...");
  const ballot2Status = await ballot2.read.getBallotStatus();
  console.log(`- Total voters: ${ballot2Status[0]}`);
  console.log(`- Total votes cast: ${ballot2Status[1]}`);

  // Get vote counts for each proposal
  for (let i = 0; i < 2; i++) {
    const proposal = await ballot2.read.proposals([BigInt(i)]);
    console.log(`- Proposal ${i} votes: ${proposal[1]}`);
  }

  const winningId2 = await ballot2.read.winningProposal();
  const winnerName2 = await ballot2.read.winnerName();
  const winnerName2String = Buffer.from(winnerName2.slice(2), "hex")
    .toString("utf8")
    .replace(/\0/g, "");
  console.log(`- Winning proposal: ${winnerName2String} (ID: ${winningId2})\n`);

  // ========== VERIFY FACTORY STATE ==========
  console.log("========== VERIFYING BALLLOT FACTORY STATE ==========");

  // Get all ballots from factory
  const allBallots = await ballotFactory.read.getAllBallots();
  console.log(`Total ballots created: ${allBallots.length}`);

  // Get active ballots
  const activeBallots = await ballotFactory.read.getActiveBallots();
  console.log(`Active ballots: ${activeBallots.length}`);

  // Get owner1's ballots
  const owner1Ballots = await ballotFactory.read.getUserBallots([
    owner1.account.address,
  ]);
  console.log(`Owner1's ballots: ${owner1Ballots.length}`);

  // Get owner2's ballots
  const owner2Ballots = await ballotFactory.read.getUserBallots([
    owner2.account.address,
  ]);
  console.log(`Owner2's ballots: ${owner2Ballots.length}`);

  // Try to close voting on the first ballot (by Owner1)
  console.log("\nClosing voting on Ballot 1...");
  await ballot1.write.setVotingState([false], { account: owner1.account });

  // Verify the ballot status has changed
  const ballot1StatusAfter = await ballot1.read.getBallotStatus();
  console.log(`Ballot 1 voting open: ${ballot1StatusAfter[2]}`);

  // Get status from factory
  const factory1Status = await ballotFactory.read.getBallotStatus([0n]);
  console.log(`Factory report - Ballot 1 voting open: ${factory1Status[3]}\n`);

  console.log("=== Testing completed successfully ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
