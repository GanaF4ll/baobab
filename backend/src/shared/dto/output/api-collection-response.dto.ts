import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

/**
 * This interface is used to define the data type for pagination responses in the services
 */
export interface CollectionResponseData<T = unknown> {
  items: T[];
  totalCount?: number | undefined;
  nextCursor?: string | null | undefined;
}

export interface ApiCollectionResponseDto<T = unknown> {
  data: CollectionResponseData<T>;
}

/**
 * This function is used to define the data type for pagination responses in the swagger documentation
 */
export function toCollectionResponseDto<T>(itemType: Type<T>) {
  class CollectionResponseData {
    @ApiProperty({ isArray: true, readOnly: true, type: itemType })
    readonly items: T[];

    @ApiProperty({ nullable: true, readOnly: true, type: String })
    readonly nextCursor: string | null;

    @ApiProperty({ readOnly: true, type: Number })
    readonly totalCount?: number;
  }

  Object.defineProperty(CollectionResponseData, 'name', {
    value: `CollectionData${itemType.name}`,
  });

  return CollectionResponseData;
}

/**
 * This function is used to define the response type for pagination responses in the swagger documentation
 */
export function toApiCollectionResponseDto<T>(itemType: Type<T>) {
  const CollectionResponseData = toCollectionResponseDto(itemType);

  class ApiCollectionResponseDto {
    @ApiProperty({ readOnly: true, required: false })
    readonly message?: string;

    @ApiProperty({ readOnly: true, type: () => CollectionResponseData })
    readonly data: InstanceType<typeof CollectionResponseData>;
  }

  Object.defineProperty(ApiCollectionResponseDto, 'name', {
    value: `ApiCollectionResponse${itemType.name}`,
  });

  return ApiCollectionResponseDto;
}
