import { StorageFolderName } from './../shared/constants';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UpdateDocumentTitleDto } from './dto/input/update-document-title.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { StorageService } from 'src/shared/storage/storage.service';
import { DocumentEntity } from './entities/document.entity';
import { and, count, eq } from 'drizzle-orm';
import * as schema from 'src/drizzle/schema';
import { FindOneWithVersionsResponseData } from './dto/output/find-one-with-versions-response.dto';
import { ParserFactory } from './parsers/parser.factory';
import { ChunkerService } from './chunking/chunker.service';
import { CreateFileDto } from 'src/shared/storage/dto/create-file.dto';
import { DocumentFilterDto } from './dto/input/document-filter.dto';
import { CollectionResponseData } from 'src/shared/dto/output/api-collection-response.dto';
import { DocumentVersionEntity } from './entities/document-version.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: StorageService,
    private readonly parserFactory: ParserFactory,
    private readonly chunkerService: ChunkerService,
  ) {}

  private logger = new Logger(DocumentsService.name);

  async store(dto: CreateFileDto) {
    //todo: storage name should be documentId/version/fileName
    const mimeType = this.resolveMimeType(dto.mimetype, dto.originalname);
    const text = await this.extractContent(dto.buffer, mimeType);
    const chunks = this.chunkerService.chunkText(text);

    // TODO: implement chunk insertion in the database
    // for (const chunk of chunks) {
    //   await this.db.insert(...)
    // }

    return chunks;
  }

  async create(
    userId: string,
    file: CreateFileDto,
    documentId?: string,
  ): Promise<DocumentVersionEntity> {
    if (documentId) {
      //? if the document already exist we create a new version
      return await this.createNewDocumentVersion(documentId, userId, file);
    }

    //? if the document does not exist yet we create the new doc and its first version
    this.logger.log('No existing document found, creating new document and its first version');

    const resolvedMimeType = this.resolveMimeType(
      file.mimetype,
      file.originalname,
    ) as (typeof schema.mimeTypeEnum.enumValues)[number];

    const [newDoc] = await this.db
      .insert(schema.documents)
      .values({
        title: file.originalname,
        currentVersion: 1,
        mimeType: resolvedMimeType,
        userId,
      })
      .returning();

    const fileName = `${newDoc.id}/${newDoc.currentVersion}/${file.originalname}`;
    const storageKey = await this.storage.upload(
      StorageFolderName.DOCUMENTS,
      fileName,
      file.buffer,
    );

    const [newDocVersion] = await this.db
      .insert(schema.documentVersions)
      .values({
        documentId: newDoc.id,
        versionNumber: newDoc.currentVersion,
        storageKey,
      })
      .returning();

    return newDocVersion;
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

  async findOne(
    id: string,
    userId: string,
  ): Promise<Pick<DocumentEntity, 'id' | 'currentVersion' | 'mimeType'>> {
    const document = await this.db.query.documents.findFirst({
      where: (documents, { eq, and }) => and(eq(documents.id, id), eq(documents.userId, userId)),
      columns: {
        id: true,
        currentVersion: true,
        mimeType: true,
      },
    });

    if (!document) {
      this.logger.error(`error finding document ${id} for user ${userId}`);
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async findOneWithVersions(id: string, userId: string): Promise<FindOneWithVersionsResponseData> {
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

  async updateTitle(id: string, userId: string, dto: UpdateDocumentTitleDto): Promise<void> {
    const existingDoc = await this.findOne(id, userId);

    await this.db
      .update(schema.documents)
      .set({ title: dto.title })
      .where(eq(schema.documents.id, existingDoc.id))
      .returning();
  }

  /*
todo: method updateContent which allows to replace the content of a document without creating a new version. 
! Can only be used on the last version

  */

  /**
   * @description removes a document version.
   * @param id document id
   * @param userId user id
   * @param versionNumber version number to remove
   */
  async removeVersion(id: string, userId: string, versionNumber: number): Promise<void> {
    const existingDoc = await this.findOneWithVersions(id, userId);

    const targetVersion = existingDoc.versions.find((v) => v.versionNumber === versionNumber);

    if (!targetVersion) {
      this.logger.error(
        `error finding version ${versionNumber} for document ${id} and user ${userId}`,
      );
      throw new NotFoundException('Version not found');
    }

    await this.db
      .delete(schema.documentVersions)
      .where(eq(schema.documentVersions.id, targetVersion.id));

    await this.storage.deleteFile(StorageFolderName.DOCUMENTS, targetVersion.storageKey);
  }

  private async extractContent(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const parser = this.parserFactory.getParser(mimeType);
    return parser.parse(fileBuffer);
  }

  private resolveMimeType(mimetype: string, filename: string): string {
    const cleanMime = mimetype?.toLowerCase().trim();
    if (cleanMime === 'application/pdf' || cleanMime === 'text/markdown') {
      return cleanMime;
    }
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'md' || ext === 'markdown') return 'text/markdown';
    return mimetype;
  }

  /**
   * @description Handles the creation of a new version for an existing document.
   * @param documentId document id
   * @param userId user id
   * @param file file to upload
   * @returns new document version
   */
  private async createNewDocumentVersion(
    documentId: string,
    userId: string,
    file: CreateFileDto,
  ): Promise<DocumentVersionEntity> {
    const existingDoc = await this.db.query.documents.findFirst({
      where: (documents, { eq, and }) =>
        and(eq(documents.id, documentId), eq(documents.userId, userId)),
      columns: {
        currentVersion: true,
        id: true,
      },
    });

    if (!existingDoc) {
      this.logger.error(`error finding document [${documentId}] for user [${userId}]`);
      throw new NotFoundException('Document not found');
    }

    const newVersionNumber = existingDoc.currentVersion + 1;

    this.logger.log(
      `Document [${existingDoc.id}] found, new version [${newVersionNumber}] will be created`,
    );

    const fileName = `${documentId}/${newVersionNumber}/${file.originalname}`;
    const storageKey = await this.storage.upload(
      StorageFolderName.DOCUMENTS,
      fileName,
      file.buffer,
    );

    const [newDocVersion] = await this.db
      .insert(schema.documentVersions)
      .values({
        documentId: existingDoc.id,
        versionNumber: newVersionNumber,
        storageKey,
      })
      .returning();

    return newDocVersion;
  }
}
