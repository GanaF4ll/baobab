import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { StorageFolderName } from '../constants';

@Injectable()
export class StorageService {
  private readonly s3: S3;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3({
      credentials: {
        accessKeyId: this.configService.getOrThrow('MINIO_ROOT_USER'),
        secretAccessKey: this.configService.getOrThrow('MINIO_ROOT_PASSWORD'),
      },
      endpoint: this.configService.getOrThrow('MINIO_ENDPOINT'),
      region: 'auto',
      forcePathStyle: true,
    });
  }

  private get publicUrl(): string {
    return this.configService.getOrThrow('MINIO_ENDPOINT');
  }

  private get bucket(): string {
    return this.configService.getOrThrow('MINIO_BUCKET');
  }

  /**
   * @description send/update a file to the S3 bucket
   * @param folder: folder in which the file will be stored
   * @param filename: file name
   * @param file: file to send
   * @returns { data: string }
   */
  async upload(folder: StorageFolderName, filename: string, file: Buffer): Promise<string> {
    try {
      const key = `${folder}/${filename}`;

      await this.s3.send(
        new PutObjectCommand({
          Body: file,
          Bucket: this.bucket,
          Key: key,
        }),
      );

      const response = `${this.publicUrl}/${key}`;
      return response;
    } catch (error) {
      console.error('Erreur upload:', error);
      throw new BadRequestException(error);
    }
  }

  /**
   * @description Deletes a file from the S3 bucket
   * @param filename
   */
  async deleteFile(folder: StorageFolderName, filename: string): Promise<void> {
    const key = `${folder}/${filename}`;
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      console.error('Erreur suppression:', error);
      throw new BadRequestException(error);
    }
  }
}
