import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ethers } from 'ethers';
import * as EnhancedBallotFactory from '../contracts/EnhancedBallotFactory.json';
import * as EnhancedBallot from '../contracts/EnhancedBallot.json';

@Controller('ballots')
export class BallotsController {
  private provider: ethers.providers.JsonRpcProvider;
  private factoryContract: ethers.Contract;

  constructor() {
    // Connect to Ethereum network - update URL for your specific network
    this.provider = new ethers.providers.JsonRpcProvider(
      'http://localhost:8545',
    );

    // Initialize factory contract - update the address after deployment
    const factoryAddress =
      process.env.FACTORY_ADDRESS ||
      '0x0000000000000000000000000000000000000000';
    this.factoryContract = new ethers.Contract(
      factoryAddress,
      EnhancedBallotFactory.abi,
      this.provider,
    );
  }

  @Get()
  async getAllBallots() {
    try {
      const ballots = await this.factoryContract.getAllBallots();
      return this.formatBallotInfo(ballots);
    } catch (error) {
      console.error('Error getting all ballots:', error);
      throw error;
    }
  }

  @Get('active')
  async getActiveBallots() {
    try {
      const ballots = await this.factoryContract.getActiveBallots();
      return this.formatBallotInfo(ballots);
    } catch (error) {
      console.error('Error getting active ballots:', error);
      throw error;
    }
  }

  @Get('user/:address')
  async getUserBallots(@Param('address') address: string) {
    try {
      const ballots = await this.factoryContract.getUserBallots(address);
      return this.formatBallotInfo(ballots);
    } catch (error) {
      console.error('Error getting user ballots:', error);
      throw error;
    }
  }

  @Get(':index')
  async getBallotDetails(@Param('index') index: number) {
    try {
      const ballot = await this.factoryContract.ballots(index);
      const status = await this.factoryContract.getBallotStatus(index);

      // Get ballot contract to fetch proposals
      const ballotContract = new ethers.Contract(
        ballot.ballotAddress,
        EnhancedBallot.abi,
        this.provider,
      );

      const proposalCount = await ballotContract.getProposalCount();
      const proposals = [];

      for (let i = 0; i < proposalCount; i++) {
        const proposal = await ballotContract.proposals(i);
        proposals.push({
          name: ethers.utils.parseBytes32String(proposal.name),
          voteCount: proposal.voteCount.toString(),
        });
      }

      return {
        address: ballot.ballotAddress,
        description: ballot.description,
        owner: ballot.owner,
        proposalCount: ballot.proposalCount.toString(),
        maxVotes: ballot.maxVotes.toString(),
        allowDelegation: ballot.allowDelegation,
        isActive: ballot.isActive,
        status: {
          totalVoters: status.totalVoters.toString(),
          votesCount: status.votesCount.toString(),
          votingOpen: status.votingOpen,
          allowDelegation: status.allowDelegation,
          maxVotes: status.maxVotes.toString(),
        },
        proposals,
      };
    } catch (error) {
      console.error('Error getting ballot details:', error);
      throw error;
    }
  }

  @Post('create')
  async createBallot(
    @Body()
    createBallotDto: {
      proposalNames: string[];
      description: string;
      maxVotes: number;
      allowDelegation: boolean;
      ownerPrivateKey: string;
    },
  ) {
    try {
      const {
        proposalNames,
        description,
        maxVotes,
        allowDelegation,
        ownerPrivateKey,
      } = createBallotDto;

      // Convert proposal names to bytes32
      const proposalNamesBytes32 = proposalNames.map((name) =>
        ethers.utils.formatBytes32String(name),
      );

      // Get signer from private key
      const wallet = new ethers.Wallet(ownerPrivateKey, this.provider);
      const factoryWithSigner = this.factoryContract.connect(wallet);

      // Create ballot transaction
      const tx = await factoryWithSigner.createBallot(
        proposalNamesBytes32,
        description,
        maxVotes,
        allowDelegation,
      );

      const receipt = await tx.wait();

      // Get the ballot address from the event
      const event = receipt.events.find((e) => e.event === 'BallotCreated');
      const ballotAddress = event.args.ballotAddress;

      return {
        success: true,
        ballotAddress,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('Error creating ballot:', error);
      throw error;
    }
  }

  @Post(':address/whitelist')
  async whitelistVoters(
    @Param('address') ballotAddress: string,
    @Body()
    whitelistDto: {
      voters: string[];
      ownerPrivateKey: string;
    },
  ) {
    try {
      const { voters, ownerPrivateKey } = whitelistDto;

      // Get signer from private key
      const wallet = new ethers.Wallet(ownerPrivateKey, this.provider);

      // Connect to the ballot contract
      const ballotContract = new ethers.Contract(
        ballotAddress,
        EnhancedBallot.abi,
        wallet,
      );

      // Whitelist voters
      const tx = await ballotContract.whitelistVoters(voters);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        votersWhitelisted: voters,
      };
    } catch (error) {
      console.error('Error whitelisting voters:', error);
      throw error;
    }
  }

  @Post(':address/vote')
  async castVote(
    @Param('address') ballotAddress: string,
    @Body()
    voteDto: {
      proposalId: number;
      voterPrivateKey: string;
    },
  ) {
    try {
      const { proposalId, voterPrivateKey } = voteDto;

      // Get signer from private key
      const wallet = new ethers.Wallet(voterPrivateKey, this.provider);

      // Connect to the ballot contract
      const ballotContract = new ethers.Contract(
        ballotAddress,
        EnhancedBallot.abi,
        wallet,
      );

      // Cast vote
      const tx = await ballotContract.vote(proposalId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        voter: wallet.address,
        proposalId,
      };
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  }

  @Post(':address/delegate')
  async delegateVote(
    @Param('address') ballotAddress: string,
    @Body()
    delegateDto: {
      delegateAddress: string;
      voterPrivateKey: string;
    },
  ) {
    try {
      const { delegateAddress, voterPrivateKey } = delegateDto;

      // Get signer from private key
      const wallet = new ethers.Wallet(voterPrivateKey, this.provider);

      // Connect to the ballot contract
      const ballotContract = new ethers.Contract(
        ballotAddress,
        EnhancedBallot.abi,
        wallet,
      );

      // Delegate vote
      const tx = await ballotContract.delegate(delegateAddress);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        from: wallet.address,
        to: delegateAddress,
      };
    } catch (error) {
      console.error('Error delegating vote:', error);
      throw error;
    }
  }

  private formatBallotInfo(ballots: any[]) {
    return ballots.map((ballot) => ({
      address: ballot.ballotAddress,
      description: ballot.description,
      owner: ballot.owner,
      maxVotes: ballot.maxVotes.toString(),
      allowDelegation: ballot.allowDelegation,
      proposalCount: ballot.proposalCount.toString(),
      isActive: ballot.isActive,
    }));
  }
}
