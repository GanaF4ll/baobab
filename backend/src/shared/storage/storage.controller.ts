import { Controller, Post, Req, UseInterceptors } from '@nestjs/common';
import { StorageService } from './storage.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { ApiConsumes } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { FastifyFilesInterceptor } from './interceptors/fastify-file.interceptor';
import { StorageFolderName } from '../constants';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @Public()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(new FastifyFilesInterceptor('file'))
  async upload(@Req() request: FastifyRequest) {
    const files = (request as any).incomingFiles;

    return this.storageService.upload(
      StorageFolderName.DOCUMENTS,
      files[0].originalname,
      files[0].buffer,
    );
  }
}
