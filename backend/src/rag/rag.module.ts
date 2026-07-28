import { Module } from '@nestjs/common';
import { OllamaModule } from '../ollama/ollama.module';
import { RagService } from './rag.service';

@Module({
  providers: [RagService],
  imports: [OllamaModule],
  exports: [RagService],
})
export class RagModule {}
