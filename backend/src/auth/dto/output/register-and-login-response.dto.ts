import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';
import { ApiResponse } from 'src/shared/constants';

export class RegisterAndLoginResponseData {
  @ApiProperty({
    readOnly: true,
    required: true,
    description: 'access token',
  })
  @IsJWT()
  readonly accessToken: string;

  @ApiProperty({
    readOnly: true,
    required: true,
    description: 'refresh token',
  })
  @IsJWT()
  readonly refreshToken: string;
}

export class RegisterAndLoginResponseDto extends ApiResponse<RegisterAndLoginResponseData> {}
