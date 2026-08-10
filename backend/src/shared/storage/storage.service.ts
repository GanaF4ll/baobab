import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageFolderName } from '../constants';

@Injectable()
export class StorageService implements OnModuleInit {
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

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      await this.setBucketPolicy();
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        try {
          await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
          console.log(`Bucket ${this.bucket} created successfully.`);
          await this.setBucketPolicy();
        } catch (createError) {
          console.error(`Failed to create bucket ${this.bucket}:`, createError);
        }
      } else {
        console.error('Failed to check bucket existence:', error);
      }
    }
  }

  private async setBucketPolicy(): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.s3.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(policy),
        }),
      );
      console.log(`Bucket policy for ${this.bucket} set to public read.`);
    } catch (policyError) {
      console.error(`Failed to set bucket policy for ${this.bucket}:`, policyError);
    }
  }

  private get publicUrl(): string {
    return this.configService.getOrThrow('MINIO_EXTERNAL_ENDPOINT');
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
  async upload(
    folder: StorageFolderName,
    filename: string,
    file: Buffer,
    contentType?: string,
  ): Promise<string> {
    try {
      const key = `${folder}/${filename}`;

      await this.s3.send(
        new PutObjectCommand({
          Body: file,
          Bucket: this.bucket,
          Key: key,
          ContentType: contentType,
        }),
      );

      const response = `${this.publicUrl}/${this.bucket}/${key}`;
      return response;
    } catch (error) {
      console.error('Erreur upload:', error);
      throw new BadRequestException(error);
    }
  }

  /**
   * @description Extract relative object key from a key or full URL
   * @param keyOrUrl key or full URL
   */
  private extractKey(keyOrUrl: string): string {
    if (!keyOrUrl) return keyOrUrl;
    const bucketPrefix = `${this.bucket}/`;
    if (keyOrUrl.includes(bucketPrefix)) {
      return keyOrUrl.substring(keyOrUrl.indexOf(bucketPrefix) + bucketPrefix.length);
    }
    try {
      if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
        const url = new URL(keyOrUrl);
        const pathname = url.pathname.replace(/^\//, '');
        if (pathname.startsWith(bucketPrefix)) {
          return pathname.substring(bucketPrefix.length);
        }
        return pathname;
      }
    } catch {
      // Ignore URL parsing errors
    }
    return keyOrUrl;
  }

  /**
   * @description Deletes a file from the S3 bucket
   * @param filename
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const key = this.extractKey(filename);
      console.log('filename: ', key);
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

  /**
   * @description Downloads a file from the S3 bucket
   * @param folder
   * @param filename
   */
  async download(filename: string): Promise<Buffer> {
    try {
      const key = this.extractKey(filename);
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      const byteArray = await response.Body?.transformToByteArray();
      if (!byteArray) {
        throw new Error('Empty file content');
      }
      return Buffer.from(byteArray);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      throw new BadRequestException(error);
    }
  }
}
