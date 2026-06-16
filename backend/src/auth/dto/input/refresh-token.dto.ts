import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    required: true,
    description: 'refresh token',
    type: String,
  })
  @IsJWT()
  @IsNotEmpty()
  refreshToken: string;
}
