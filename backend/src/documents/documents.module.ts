import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { StorageModule } from 'src/shared/storage/storage.module';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  imports: [StorageModule],
})
export class DocumentsModule {}
