import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ readOnly: true, required: true })
  readonly access_token: string;
}
