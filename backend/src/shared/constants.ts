import { ApiProperty } from '@nestjs/swagger';

export enum TokenType {
  ACCESS = 'access',
  RESET = 'reset',
  REFRESH = 'refresh',
}

export abstract class ApiResponse<T> {
  @ApiProperty({ readOnly: true, required: true })
  readonly data: T;
}

export enum StorageFolderName {
  DOCUMENTS = 'documents',
}
