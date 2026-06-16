import { ApiProperty } from '@nestjs/swagger';

export class RegisterAndLoginResponseDto {
  @ApiProperty({
    readOnly: true,
    required: true,
    description: 'access token',
  })
  readonly data: string;
}
