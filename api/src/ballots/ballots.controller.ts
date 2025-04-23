import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ethers } from 'ethers';
import * as BallotFactory from '../contracts/BallotFactory.json';
import * as Ballot from '../contracts/Ballot.json';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateBallotDto } from './dto/create-ballot.dto';
import { WhitelistVotersDto } from './dto/whitelist-voters.dto';
import { VoteDto } from './dto/vote.dto';
import { DelegateVoteDto } from './dto/delegate-vote.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('ballots')
@Controller('ballots')
export class BallotsController {
  private provider: ethers.JsonRpcProvider;
  private factoryContract: ethers.Contract;
  private isInitialized: boolean = false;

  constructor(private configService: ConfigService) {
    this.initializeProvider();
  }

  private initializeProvider() {
    try {
      // Connect to Ethereum network
      const rpcUrl =
        this.configService.get('RPC_URL') || 'http://localhost:8545';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Initialize factory contract using the address from env
      const factoryAddress = this.configService.get('FACTORY_ADDRESS');

      if (
        !factoryAddress ||
        factoryAddress === '0x0000000000000000000000000000000000000000'
      ) {
        console.error('Invalid FACTORY_ADDRESS in environment variables');
        return;
      }

      console.log('Factory Address:', factoryAddress);
      console.log('BallotFactory ABI exists:', !!BallotFactory.abi);

      if (!BallotFactory.abi) {
        console.error('BallotFactory ABI is missing or invalid');
        return;
      }

      this.factoryContract = new ethers.Contract(
        factoryAddress,
        BallotFactory.abi,
        this.provider,
      );

      this.isInitialized = true;
      console.log('BallotFactory contract initialized successfully');
    } catch (error) {
      console.error('Error initializing provider:', error);
    }
  }

  @ApiOperation({ summary: 'Get all ballots' })
  @ApiResponse({
    status: 200,
    description: 'Returns all ballots in the system',
  })
  @Get()
  async getAllBallots() {
    try {
      if (!this.isInitialized || !this.factoryContract) {
        throw new HttpException(
          'Contract not initialized properly. Check your environment variables and network connection.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      console.log('Attempting to call getAllBallots() on factory contract...');
      console.log('Factory contract address:', this.factoryContract.target);

      try {
        const ballots = await this.factoryContract.getAllBallots();
        return this.formatBallotInfo(ballots);
      } catch (contractError) {
        console.error('Contract call error details:', {
          message: contractError.message,
          code: contractError.code,
          method: 'getAllBallots',
          args: [],
          stack: contractError.stack,
        });
        throw contractError;
      }
    } catch (error) {
      console.error('Error getting all ballots:', error);

      let errorMessage = 'Unknown error';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `Error code: ${error.code}`;
      }

      throw new HttpException(
        `Failed to get ballots: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get active ballots' })
  @ApiResponse({
    status: 200,
    description: 'Returns all active ballots',
  })
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

  @ApiOperation({ summary: 'Get ballots by user address' })
  @ApiParam({ name: 'address', description: 'Ethereum address of the user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all ballots created by a specific user',
  })
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

  @ApiOperation({ summary: 'Get ballot details by index' })
  @ApiParam({ name: 'index', description: 'Index of the ballot' })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed information about a specific ballot',
  })
  @Get(':index')
  async getBallotDetails(@Param('index') index: number) {
    try {
      const ballot = await this.factoryContract.ballots(index);
      const status = await this.factoryContract.getBallotStatus(index);

      // Get ballot contract to fetch proposals
      const ballotContract = new ethers.Contract(
        ballot.ballotAddress,
        Ballot.abi,
        this.provider,
      );

      const proposalCount = await ballotContract.getProposalCount();
      const proposals: { name: string; voteCount: string }[] = [];

      for (let i = 0; i < proposalCount; i++) {
        const proposal = await ballotContract.proposals(i);
        proposals.push({
          name: ethers.decodeBytes32String(proposal.name),
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

  @ApiOperation({ summary: 'Create a new ballot' })
  @ApiResponse({
    status: 201,
    description: 'Ballot created successfully',
  })
  @Post('create')
  async createBallot(@Body() createBallotDto: CreateBallotDto) {
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
        ethers.encodeBytes32String(name),
      );

      // Get signer from private key
      const wallet = new ethers.Wallet(ownerPrivateKey, this.provider);
      const factoryWithSigner = this.factoryContract.connect(wallet);

      // Create ballot transaction
      const tx = await (
        factoryWithSigner as ethers.Contract & { createBallot: Function }
      ).createBallot(
        proposalNamesBytes32,
        description,
        maxVotes,
        allowDelegation,
      );

      const receipt = await tx.wait();

      // Get the ballot address from the event
      const event = receipt.logs.find((log) => {
        try {
          const parsed = this.factoryContract.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          return parsed?.name === 'BallotCreated';
        } catch (e) {
          return false;
        }
      });

      const parsedEvent = this.factoryContract.interface.parseLog({
        topics: event.topics,
        data: event.data,
      });
      const ballotAddress = parsedEvent?.args?.ballotAddress;

      return {
        success: true,
        ballotAddress,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error creating ballot:', error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Whitelist voters for a ballot' })
  @ApiParam({ name: 'address', description: 'Address of the ballot' })
  @ApiResponse({
    status: 200,
    description: 'Voters whitelisted successfully',
  })
  @Post(':address/whitelist')
  async whitelistVoters(
    @Param('address') ballotAddress: string,
    @Body() whitelistDto: WhitelistVotersDto,
  ) {
    try {
      const { voters, ownerPrivateKey } = whitelistDto;

      // Get signer from private key
      const wallet = new ethers.Wallet(ownerPrivateKey, this.provider);

      // Connect to the ballot contract
      const ballotContract = new ethers.Contract(
        ballotAddress,
        Ballot.abi,
        wallet,
      );

      // Whitelist voters
      const tx = await ballotContract.whitelistVoters(voters);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        votersWhitelisted: voters,
      };
    } catch (error) {
      console.error('Error whitelisting voters:', error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Cast a vote on a ballot' })
  @ApiParam({ name: 'address', description: 'Address of the ballot' })
  @ApiResponse({
    status: 200,
    description: 'Vote cast successfully',
  })
  @Post(':address/vote')
  async castVote(
    @Param('address') ballotAddress: string,
    @Body() voteDto: VoteDto,
  ) {
    try {
      const { proposalId, voterPrivateKey } = voteDto;

      // Get signer from private key
      const wallet = new ethers.Wallet(voterPrivateKey, this.provider);

      // Connect to the ballot contract
      const ballotContract = new ethers.Contract(
        ballotAddress,
        Ballot.abi,
        wallet,
      );

      // Cast vote
      const tx = await ballotContract.vote(proposalId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        voter: wallet.address,
        proposalId,
      };
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Delegate a vote to another voter' })
  @ApiParam({ name: 'address', description: 'Address of the ballot' })
  @ApiResponse({
    status: 200,
    description: 'Vote delegated successfully',
  })
  @Post(':address/delegate')
  async delegateVote(
    @Param('address') ballotAddress: string,
    @Body() delegateDto: DelegateVoteDto,
  ) {
    try {
      const { delegateAddress, voterPrivateKey } = delegateDto;

      // Get signer from private key
      const wallet = new ethers.Wallet(voterPrivateKey, this.provider);

      // Connect to the ballot contract
      const ballotContract = new ethers.Contract(
        ballotAddress,
        Ballot.abi,
        wallet,
      );

      // Delegate vote
      const tx = await ballotContract.delegate(delegateAddress);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
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
