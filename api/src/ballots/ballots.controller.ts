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
    description: 'Information needed for the frontend to create a ballot',
  })
  @Post('create')
  async createBallot(@Body() createBallotDto: CreateBallotDto) {
    try {
      const {
        proposalNames,
        description,
        maxVotes,
        allowDelegation,
        ownerAddress,
      } = createBallotDto;

      // Convert proposal names to bytes32
      const proposalNamesBytes32 = proposalNames.map((name) =>
        ethers.encodeBytes32String(name),
      );

      // Return information for the frontend to create the ballot
      return {
        success: true,
        factoryAddress: this.factoryContract.target,
        factoryInterface: BallotFactory.abi,
        params: {
          proposalNames: proposalNamesBytes32,
          description,
          maxVotes,
          allowDelegation,
          ownerAddress,
        },
        message: 'Please complete this transaction in your frontend wallet',
      };
    } catch (error) {
      console.error('Error preparing ballot creation data:', error);
      throw new HttpException(
        `Failed to prepare ballot creation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Whitelist voters for a ballot' })
  @ApiParam({ name: 'address', description: 'Address of the ballot' })
  @ApiResponse({
    status: 200,
    description: 'Information needed for the frontend to whitelist voters',
  })
  @Post(':address/whitelist')
  async whitelistVoters(
    @Param('address') ballotAddress: string,
    @Body() whitelistDto: WhitelistVotersDto,
  ) {
    try {
      const { voters, ownerAddress } = whitelistDto;

      // Return information for the frontend to whitelist voters
      return {
        success: true,
        ballotAddress,
        ballotInterface: Ballot.abi,
        params: {
          voters,
          ownerAddress,
        },
        functionName: 'whitelistVoters',
        message: 'Please complete this transaction in your frontend wallet',
      };
    } catch (error) {
      console.error('Error preparing whitelist data:', error);
      throw new HttpException(
        `Failed to prepare whitelist data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
