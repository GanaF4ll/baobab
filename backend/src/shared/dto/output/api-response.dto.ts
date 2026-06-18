import { ApiProperty } from '@nestjs/swagger';

export abstract class ApiResponseDto<T> {
  @ApiProperty({ readOnly: true, required: true })
  readonly data: T;
}
