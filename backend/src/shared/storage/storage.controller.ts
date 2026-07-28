import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiExcludeController } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { Public } from 'src/auth/decorators/public.decorator';
import { StorageFolderName } from '../constants';
import { FastifyFilesInterceptor } from './interceptors/fastify-file.interceptor';
import { StorageService } from './storage.service';

@Controller('storage')
@ApiExcludeController()
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

  @Delete()
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Body() body: { filename: string }) {
    const folder = StorageFolderName.DOCUMENTS;
    return this.storageService.deleteFile(folder, body.filename);
  }
}
