import { toApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { MessageResponseDto } from './find-one-conversation-response.dto';

export const findNextMessagesResponseDto = toApiCollectionResponseDto(MessageResponseDto);
