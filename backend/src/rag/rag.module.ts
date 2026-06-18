import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { OllamaModule } from '../ollama/ollama.module';
import { RagController } from './rag.controller';

@Module({
  providers: [RagService],
  imports: [OllamaModule],
  controllers: [RagController],
})
export class RagModule {}
