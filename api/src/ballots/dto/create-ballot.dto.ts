import { ApiProperty } from '@nestjs/swagger';

export class CreateBallotDto {
  @ApiProperty({
    description: 'Names of the proposals in the ballot',
    example: ['Proposal 1', 'Proposal 2', 'Proposal 3'],
    type: [String],
  })
  proposalNames: string[];

  @ApiProperty({
    description: 'Description of the ballot',
    example: 'Community vote on project direction',
  })
  description: string;

  @ApiProperty({
    description: 'Maximum number of votes allowed per voter',
    example: 1,
  })
  maxVotes: number;

  @ApiProperty({
    description: 'Whether to allow vote delegation',
    example: true,
  })
  allowDelegation: boolean;

  @ApiProperty({
    description: 'Private key of the ballot creator',
    example: '0x1234...',
  })
  ownerPrivateKey: string;
}
