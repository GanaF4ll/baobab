import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';
import { ApiResponseDto } from 'src/shared/dto/output/api-response.dto';

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

export class RegisterAndLoginResponseDto extends ApiResponseDto<RegisterAndLoginResponseData> {
  @ApiProperty({ type: RegisterAndLoginResponseData })
  declare data: RegisterAndLoginResponseData;
}
