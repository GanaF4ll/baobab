import { Module } from '@nestjs/common';
import { StorageModule } from 'src/shared/storage/storage.module';
import { StorageService } from 'src/shared/storage/storage.service';
import { TrashController } from './trash.controller';
import { TrashService } from './trash.service';

@Module({
  controllers: [TrashController],
  providers: [TrashService, StorageService],
  imports: [StorageModule],
})
export class TrashModule {}
