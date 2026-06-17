import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateDocumentDto } from './dto/input/create-document.dto';
import { UpdateDocumentDto } from './dto/input/update-document.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { StorageService } from 'src/shared/storage/storage.service';
import { DocumentFilterDto } from './dto/input/document-filter.dto';
import { CollectionResponseData } from 'src/shared/dto/output/api-collection-response.dto';
import { DocumentEntity } from './entities/document.entity';
import { and, count, eq } from 'drizzle-orm';
import * as schema from 'src/drizzle/schema';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: StorageService,
  ) {}
  private logger = new Logger(DocumentsService.name);
  create(createDocumentDto: CreateDocumentDto) {
    return 'This action adds a new document';
  }

  async findAll(
    userId: string,
    filters: DocumentFilterDto,
  ): Promise<CollectionResponseData<DocumentEntity>> {
    const { limit, cursor, order, mimeType } = filters;
    const take = limit ?? 10;

    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorDoc = await this.db.query.documents.findFirst({
        where: (documents, { eq }) => eq(documents.id, cursor),
      });
      if (cursorDoc) {
        cursorDate = cursorDoc.createdAt;
      }
    }

    const [documents, [{ countValue }]] = await Promise.all([
      this.db.query.documents.findMany({
        where: (documents, { eq, and, gte, lte, ne }) =>
          and(
            eq(documents.userId, userId),
            ...(mimeType ? [eq(documents.mimeType, mimeType)] : []),
            ...(cursorDate
              ? order === 'desc'
                ? [lte(documents.createdAt, cursorDate)]
                : [gte(documents.createdAt, cursorDate)]
              : []),
            ...(cursor ? [ne(documents.id, cursor)] : []),
          ),
        limit: take + 1,
        orderBy: (documents, { desc, asc }) =>
          order === 'desc' ? desc(documents.createdAt) : asc(documents.createdAt),
      }),
      this.db
        .select({ countValue: count() })
        .from(schema.documents)
        .where(
          and(
            eq(schema.documents.userId, userId),
            ...(mimeType ? [eq(schema.documents.mimeType, mimeType)] : []),
          ),
        ),
    ]);

    const hasNextPage = documents.length > take;
    const items = hasNextPage ? documents.slice(0, take) : documents;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return {
      items,
      totalCount: Number(countValue),
      nextCursor,
    };
  }

  async findOne(id: string, userId: string): Promise<DocumentEntity> {
    const document = await this.db.query.documents.findFirst({
      where: (documents, { eq, and }) => and(eq(documents.id, id), eq(documents.userId, userId)),
      with: {
        versions: {
          columns: {
            versionNumber: true,
            id: true,
            storageKey: true,
            changeSummary: true,
            createdAt: true,
          },
        },
      },
    });

    if (!document) {
      this.logger.error(`error finding document ${id} for user ${userId}`);
      throw new NotFoundException('Document not found');
    }

    return document;
  }
  async findOneWithVersions(id: string, userId: string): Promise<DocumentEntity> {
    const document = await this.db.query.documents.findFirst({
      where: (documents, { eq, and }) => and(eq(documents.id, id), eq(documents.userId, userId)),
      with: {
        versions: {
          columns: {
            versionNumber: true,
            id: true,
            storageKey: true,
            changeSummary: true,
            createdAt: true,
          },
        },
      },
    });

    if (!document) {
      this.logger.error(`error finding document ${id} for user ${userId}`);
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  update(id: string, updateDocumentDto: UpdateDocumentDto) {
    return `This action updates a #${id} document`;
  }

  remove(id: string) {
    return `This action removes a #${id} document`;
  }
}
