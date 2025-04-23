import { ApiProperty } from '@nestjs/swagger';

export class DelegateVoteDto {
  @ApiProperty({
    description: 'Ethereum address of the delegate',
    example: '0x123456...',
  })
  delegateAddress: string;

  @ApiProperty({
    description: 'Private key of the voter delegating their vote',
    example: '0x1234...',
  })
  voterPrivateKey: string;
}
