import { viem } from "hardhat";
import { formatEther, parseEther, stringToHex } from "viem";

async function main() {
  console.log("=== Testing Ballot Factory and Ballot Contracts ===\n");

  const publicClient = await viem.getPublicClient();
  const [deployer, voter1, voter2, voter3] = await viem.getWalletClients();

  console.log(`Deployer address: ${deployer.account.address}`);
  console.log(`Voter1 address: ${voter1.account.address}`);
  console.log(`Voter2 address: ${voter2.account.address}`);
  console.log(`Voter3 address: ${voter3.account.address}\n`);

  // Deploy BallotFactory contract
  console.log("Deploying BallotFactory contract...");
  const ballotFactory = await viem.deployContract("BallotFactory");
  console.log(`BallotFactory deployed at: ${ballotFactory.address}\n`);

  // Create a new ballot
  console.log("Creating a new ballot with 3 proposals...");
  // Convert strings to bytes32 properly
  const proposal1 = stringToHex("Proposal 1", { size: 32 });
  const proposal2 = stringToHex("Proposal 2", { size: 32 });
  const proposal3 = stringToHex("Proposal 3", { size: 32 });

  const proposals = [proposal1, proposal2, proposal3];

  const description = "Test Ballot for Community Decision";
  const maxVotes = 100n;
  const allowDelegation = true;

  const createTx = await ballotFactory.write.createBallot([
    proposals,
    description,
    maxVotes,
    allowDelegation,
  ]);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: createTx,
  });
  console.log(`Ballot created in transaction: ${receipt.transactionHash}\n`);

  // Get all ballots and find the one we just created
  const allBallots = await ballotFactory.read.getAllBallots();
  console.log(`Total ballots created: ${allBallots.length}`);

  const newBallotInfo = allBallots[allBallots.length - 1];
  console.log("New ballot info:");
  console.log(`- Address: ${newBallotInfo.ballotAddress}`);
  console.log(`- Description: ${newBallotInfo.description}`);
  console.log(`- Owner: ${newBallotInfo.owner}`);
  console.log(`- Max votes: ${newBallotInfo.maxVotes}`);
  console.log(`- Allow delegation: ${newBallotInfo.allowDelegation}`);
  console.log(`- Proposal count: ${newBallotInfo.proposalCount}`);
  console.log(`- Is active: ${newBallotInfo.isActive}\n`);

  // Interact with the Ballot contract
  console.log("Interacting with the deployed Ballot contract...");
  const ballot = await viem.getContractAt(
    "Ballot",
    newBallotInfo.ballotAddress
  );

  // Whitelist voters
  console.log("Whitelisting voters...");
  const whitelistTx1 = await ballot.write.whitelistVoter([
    voter1.account.address,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: whitelistTx1 });

  const whitelistTx2 = await ballot.write.whitelistVoters([
    [voter2.account.address, voter3.account.address],
  ]);
  await publicClient.waitForTransactionReceipt({ hash: whitelistTx2 });

  // Check if voters are whitelisted - fixed to correctly access voter struct fields
  console.log("Checking voter whitelist status...");

  const voter1Data = await ballot.read.voters([voter1.account.address]);
  console.log(`Voter1 is whitelisted: ${voter1Data[1]}`); // isWhitelisted is the second field in the struct
  console.log(`Voter1 weight: ${voter1Data[4]}`); // weight is the fifth field

  const voter2Data = await ballot.read.voters([voter2.account.address]);
  console.log(`Voter2 is whitelisted: ${voter2Data[1]}`);
  console.log(`Voter2 weight: ${voter2Data[4]}`);

  const voter3Data = await ballot.read.voters([voter3.account.address]);
  console.log(`Voter3 is whitelisted: ${voter3Data[1]}`);
  console.log(`Voter3 weight: ${voter3Data[4]}\n`);

  // Check initial proposal vote counts
  console.log("Initial proposal vote counts:");
  for (let i = 0; i < 3; i++) {
    const proposal = await ballot.read.proposals([BigInt(i)]);
    console.log(`Proposal ${i} votes: ${proposal[1]}`);
  }
  console.log();

  // Cast votes
  console.log("Casting votes...");
  const voteTx1 = await ballot.write.vote([0n], {
    account: voter1.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: voteTx1 });
  console.log(`Voter1 voted for proposal 0`);

  const voteTx2 = await ballot.write.vote([1n], {
    account: voter2.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: voteTx2 });
  console.log(`Voter2 voted for proposal 1`);

  // Check proposal vote counts after direct voting
  console.log("\nProposal vote counts after direct voting:");
  for (let i = 0; i < 3; i++) {
    const proposal = await ballot.read.proposals([BigInt(i)]);
    console.log(`Proposal ${i} votes: ${proposal[1]}`);
  }

  // Test delegation
  console.log("\nTesting delegation...");
  const delegateTx = await ballot.write.delegate([voter1.account.address], {
    account: voter3.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: delegateTx });
  console.log(`Voter3 delegated vote to Voter1`);

  // Check voters' state after delegation
  console.log("\nVoter states after delegation:");

  const voter1DataAfter = await ballot.read.voters([voter1.account.address]);
  console.log(`Voter1 has voted: ${voter1DataAfter[0]}`);
  console.log(`Voter1 weight: ${voter1DataAfter[4]}`);
  console.log(`Voter1 votedProposalId: ${voter1DataAfter[2]}`);

  const voter3DataAfter = await ballot.read.voters([voter3.account.address]);
  console.log(`Voter3 has voted: ${voter3DataAfter[0]}`);
  console.log(`Voter3 delegate: ${voter3DataAfter[3]}`);
  console.log(`Voter3 weight: ${voter3DataAfter[4]}`);

  // Check proposal vote counts after delegation
  console.log("\nProposal vote counts after delegation:");
  for (let i = 0; i < 3; i++) {
    const proposal = await ballot.read.proposals([BigInt(i)]);
    console.log(`Proposal ${i} votes: ${proposal[1]}`);
  }

  // Check ballot status
  console.log("\nChecking ballot status...");
  const ballotStatus = await ballot.read.getBallotStatus();
  console.log(`Total whitelisted voters: ${ballotStatus[0]}`);
  console.log(`Total votes cast: ${ballotStatus[1]}`);
  console.log(`Is voting open: ${ballotStatus[2]}`);
  console.log(`Is delegation allowed: ${ballotStatus[3]}`);
  console.log(`Max allowed votes: ${ballotStatus[4]}\n`);

  // Check winning proposal
  const winningProposalId = await ballot.read.winningProposal();
  const winnerName = await ballot.read.winnerName();
  console.log(`Winning proposal ID: ${winningProposalId}`);
  console.log(`Winner name (in bytes32): ${winnerName}`);

  // Convert the winner name from bytes32 to string
  const winnerNameString = Buffer.from(winnerName.slice(2), "hex")
    .toString("utf8")
    .replace(/\0/g, "");
  console.log(`Winner name (decoded): ${winnerNameString}`);

  // Close voting
  console.log("\nClosing the voting...");
  const closeTx = await ballot.write.setVotingState([false]);
  await publicClient.waitForTransactionReceipt({ hash: closeTx });

  const votingOpen = (await ballot.read.getBallotStatus())[2];
  console.log(`Is voting still open: ${votingOpen}`);

  // Get ballot status from factory
  console.log("\nGetting ballot status from factory...");
  const factoryStatus = await ballotFactory.read.getBallotStatus([0n]);
  console.log(`Is active: ${factoryStatus[0]}`);
  console.log(`Total voters: ${factoryStatus[1]}`);
  console.log(`Votes count: ${factoryStatus[2]}`);
  console.log(`Voting open: ${factoryStatus[3]}`);
  console.log(`Allow delegation: ${factoryStatus[4]}`);
  console.log(`Max votes: ${factoryStatus[5]}\n`);

  console.log("=== Test completed successfully ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
