import { ApiProperty } from '@nestjs/swagger';

export class VoteDto {
  @ApiProperty({
    description: 'ID of the proposal to vote for',
    example: 0,
  })
  proposalId: number;

  @ApiProperty({
    description: 'Private key of the voter',
    example: '0x1234...',
  })
  voterPrivateKey: string;
}
