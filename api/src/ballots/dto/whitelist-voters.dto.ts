import { ApiProperty } from '@nestjs/swagger';

export class WhitelistVotersDto {
  @ApiProperty({
    description: 'Ethereum addresses of voters to whitelist',
    example: ['0x123456...', '0x789abc...'],
    type: [String],
  })
  voters: string[];

  @ApiProperty({
    description: 'Address of the ballot owner',
    example: '0x1234...',
  })
  ownerAddress: string;
}
