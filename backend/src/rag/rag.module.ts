import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { OllamaModule } from '../ollama/ollama.module';
import { RagService } from './rag.service';

@Module({
  providers: [RagService],
  imports: [OllamaModule, DocumentsModule],
  exports: [RagService],
})
export class RagModule {}
