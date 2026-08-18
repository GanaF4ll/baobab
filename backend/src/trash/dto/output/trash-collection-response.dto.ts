import { toApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { TrashItemDto } from './trash-response.dto';

export const TrashCollectionResponseDto = toApiCollectionResponseDto(TrashItemDto);
