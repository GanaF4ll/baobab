import { Module } from '@nestjs/common';
import { StorageModule } from 'src/shared/storage/storage.module';
import { StorageService } from 'src/shared/storage/storage.service';
import { TrashService } from './services/trash.service';
import { TrashCronService } from './services/trash-cron.service';
import { TrashController } from './trash.controller';

@Module({
  controllers: [TrashController],
  providers: [TrashService, StorageService, TrashCronService],
  imports: [StorageModule],
})
export class TrashModule {}
