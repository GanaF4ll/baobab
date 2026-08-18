import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrashService } from './trash.service';

@Injectable()
export class TrashCronService {
  constructor(readonly trashService: TrashService) {}

  private readonly logger = new Logger(TrashCronService.name);

  @Cron(CronExpression.EVERY_10_SECONDS)
  async removeSoftDeleted() {
    this.logger.warn('Starting to purge all resources marked for deletion');
    await this.trashService.purgeAllRessourcesMarkedForDeletion();
    this.logger.warn('Finished purging all resources marked for deletion');
  }
}
