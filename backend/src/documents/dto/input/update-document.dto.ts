import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './input/create-document.dto';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
