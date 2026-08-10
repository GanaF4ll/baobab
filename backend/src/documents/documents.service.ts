import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, count, eq, inArray, isNull, max } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { OllamaService } from 'src/ollama/ollama.service';
import { CollectionResponseData } from 'src/shared/dto/output/api-collection-response.dto';
import { CreateFileDto } from 'src/shared/storage/dto/create-file.dto';
import { StorageService } from 'src/shared/storage/storage.service';
import { StorageFolderName } from './../shared/constants';
import { ChunkerService } from './chunking/chunker.service';
import { DocumentFilterDto } from './dto/input/document-filter.dto';
import { UpdateDocumentTitleDto } from './dto/input/update-document-title.dto';
import { FindOneWithVersionsResponseData } from './dto/output/find-one-with-versions-response.dto';
import { DocumentEntity } from './entities/document.entity';
import { DocumentVersionEntity } from './entities/document-version.entity';
import { ParserFactory } from './parsers/parser.factory';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: StorageService,
    private readonly parserFactory: ParserFactory,
    private readonly chunkerService: ChunkerService,
    private readonly ollamaService: OllamaService,
  ) {}

  private logger = new Logger(DocumentsService.name);

  async create(
    userId: string,
    file: CreateFileDto,
    workspaceId: string,
    documentId?: string,
  ): Promise<DocumentVersionEntity> {
    const existingWorkspace = await this.db.query.workspaces.findFirst({
      where: (workspaces, { eq, and }) =>
        and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)),
      columns: {
        id: true,
      },
    });

    if (!existingWorkspace) {
      this.logger.error(`error finding workspace [${workspaceId}] for user [${userId}]`);
      throw new NotFoundException('Workspace not found');
    }

    if (documentId) {
      //? if the document already exist we create a new version
      return await this.createNewDocumentVersion(documentId, userId, file, workspaceId);
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
        mimeType: resolvedMimeType,
        userId,
        workspaceId,
      })
      .returning();

    const fileName = `${newDoc.id}/1/${file.originalname}`;
    const storageKey = await this.storage.upload(
      StorageFolderName.DOCUMENTS,
      fileName,
      file.buffer,
      file.mimetype,
    );

    const [newDocVersion] = await this.db
      .insert(schema.documentVersions)
      .values({
        documentId: newDoc.id,
        versionNumber: 1,
        storageKey,
      })
      .returning();

    await this.storeChunks(file.buffer, resolvedMimeType, workspaceId, newDocVersion.id);

    return newDocVersion;
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
    workspaceId: string,
  ): Promise<DocumentVersionEntity> {
    const existingDoc = await this.db.query.documents.findFirst({
      where: (documents, { eq, and }) =>
        and(eq(documents.id, documentId), eq(documents.userId, userId)),
      columns: {
        id: true,
      },
    });

    if (!existingDoc) {
      this.logger.error(`error finding document [${documentId}] for user [${userId}]`);
      throw new NotFoundException('Document not found');
    }

    const [maxVersionResult] = await this.db
      .select({ maxVersion: max(schema.documentVersions.versionNumber) })
      .from(schema.documentVersions)
      .where(eq(schema.documentVersions.documentId, existingDoc.id));

    const newVersionNumber = (maxVersionResult?.maxVersion ?? 0) + 1;

    this.logger.log(
      `Document [${existingDoc.id}] found, new version [${newVersionNumber}] will be created`,
    );

    const fileName = `${documentId}/${newVersionNumber}/${file.originalname}`;
    const storageKey = await this.storage.upload(
      StorageFolderName.DOCUMENTS,
      fileName,
      file.buffer,
      file.mimetype,
    );

    const [newDocVersion] = await this.db
      .insert(schema.documentVersions)
      .values({
        documentId: existingDoc.id,
        versionNumber: newVersionNumber,
        storageKey,
      })
      .returning();

    const resolvedMimeType = this.resolveMimeType(file.mimetype, file.originalname);

    await this.storeChunks(file.buffer, resolvedMimeType, workspaceId, newDocVersion.id);
    return newDocVersion;
  }

  async findAllByWorkspace(
    userId: string,
    workspaceId: string,
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
            eq(documents.workspaceId, workspaceId),
            ...(mimeType ? [eq(documents.mimeType, mimeType)] : []),
            isNull(schema.documents.deletedAt),

            ...(cursorDate
              ? order === 'desc'
                ? [lte(documents.createdAt, cursorDate)]
                : [gte(documents.createdAt, cursorDate)]
              : []),
            ...(cursor ? [ne(documents.id, cursor)] : []),
          ),
        with: {
          versions: {
            columns: {
              id: true,
              documentId: true,
              versionNumber: true,
              storageKey: true,
              changeSummary: true,
              createdAt: true,
            },
            orderBy: (versions, { desc }) => desc(versions.versionNumber),
          },
        },
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
            isNull(schema.documents.deletedAt),
          ),
        ),
    ]);

    const hasNextPage = documents.length > take;
    const rawItems = hasNextPage ? documents.slice(0, take) : documents;
    const nextCursor = hasNextPage ? rawItems[rawItems.length - 1]?.id : null;

    const items: DocumentEntity[] = rawItems.map((doc) => ({
      ...doc,
      currentVersion: doc.versions?.[0]?.versionNumber ?? 0,
    }));

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
      where: (documents, { eq, and, isNull }) =>
        and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)),
      columns: {
        id: true,
        mimeType: true,
      },
      with: {
        versions: {
          where: (versions, { isNull }) => isNull(versions.deletedAt),
          orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
          limit: 1,
          columns: {
            versionNumber: true,
          },
        },
      },
    });

    if (!document) {
      this.logger.error(`error finding document ${id} for user ${userId}`);
      throw new NotFoundException('Document not found');
    }

    return {
      id: document.id,
      mimeType: document.mimeType,
      currentVersion: document.versions?.[0]?.versionNumber ?? 0,
    };
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
            deletedAt: true,
          },
        },
      },
    });

    if (!document) {
      this.logger.error(`error finding document ${id} for user ${userId}`);
      throw new NotFoundException('Document not found');
    }

    return {
      ...document,
      currentVersion: document.versions?.[0]?.versionNumber ?? 0,
    };
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

  async restoreDocument(documentId: string, workspaceId: string, userId: string): Promise<void> {
    const existingDoc = await this.findOneWithVersions(documentId, userId);

    if (existingDoc.workspaceId !== workspaceId) {
      this.logger.error(
        `The document [${existingDoc.id}] does not belong to the workspace [${workspaceId}]`,
      );
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    await this.db
      .update(schema.documents)
      .set({
        deletedAt: null,
      })
      .where(eq(schema.documents.id, existingDoc.id));

    await this.db
      .update(schema.documentVersions)
      .set({
        deletedAt: null,
      })
      .where(eq(schema.documentVersions.documentId, existingDoc.id));

    const latestVersion = [...existingDoc.versions].sort(
      (a, b) => b.versionNumber - a.versionNumber,
    )[0];

    if (latestVersion) {
      const file = await this.storage.download(latestVersion.storageKey);
      const mimeType = this.resolveMimeType(existingDoc.mimeType, latestVersion.storageKey);

      await this.storeChunks(file, mimeType, workspaceId, latestVersion.id);
    }
  }

  /**
   * @description moves a document and its versions to the trash
   * @param documentId
   * @param workspaceId
   * @param userId
   */
  async softDeleteDocument(documentId: string, workspaceId: string, userId: string): Promise<void> {
    const existingDoc = await this.findOneWithVersions(documentId, userId);

    if (existingDoc.workspaceId !== workspaceId) {
      this.logger.error(
        `The document [${existingDoc.id}] does not belong to the workspace [${workspaceId}]`,
      );
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    await this.db
      .update(schema.documents)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(schema.documents.id, existingDoc.id));

    await this.db
      .update(schema.documentVersions)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(schema.documentVersions.documentId, existingDoc.id));

    await this.db.delete(schema.chunks).where(
      inArray(
        schema.chunks.versionId,
        existingDoc.versions.map((v) => v.id),
      ),
    );
  }

  async removeDocument(documentId: string, workspaceId: string, userId: string): Promise<void> {
    const existingDoc = await this.findOneWithVersions(documentId, userId);

    if (existingDoc.workspaceId !== workspaceId) {
      this.logger.error(
        `The document [${existingDoc.id}] does not belong to the workspace [${workspaceId}]`,
      );
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    await this.storage.deleteBulk(existingDoc.versions.map((v) => v.storageKey));

    await this.db.delete(schema.documents).where(eq(schema.documents.id, existingDoc.id));

    await this.db
      .delete(schema.documentVersions)
      .where(eq(schema.documentVersions.documentId, existingDoc.id));

    await this.db.delete(schema.chunks).where(
      inArray(
        schema.chunks.versionId,
        existingDoc.versions.map((v) => v.id),
      ),
    );

    this.logger.debug(
      `Document [${documentId}] and its versions have been deleted from the workspace [${workspaceId}] for user [${userId}]`,
    );
  }

  /**
   * @description soft deletes a document version. Destroys the embeddings.
   * @param documentId document id
   * @param userId user id
   * @param versionId version id to remove
   */
  async softDeleteVersion(
    documentId: string,
    userId: string,
    versionId: string,
    workspaceId: string,
  ): Promise<void> {
    const existingDoc = await this.findOneWithVersions(documentId, userId);

    if (existingDoc.workspaceId !== workspaceId) {
      this.logger.error(
        `The document [${existingDoc.id}] does not belong to the workspace [${workspaceId}]`,
      );
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    const targetVersion = existingDoc.versions.find((v) => v.id === versionId);

    if (!targetVersion) {
      this.logger.error(
        `error finding version ${versionId} for document ${documentId} and user ${userId}`,
      );
      throw new NotFoundException('Version not found');
    }

    if (targetVersion.deletedAt) {
      this.logger.error(
        `Version [${targetVersion.versionNumber}] of document [${documentId}] has already been marked for deletion`,
      );
      throw new ForbiddenException('Version has already been marked for deletion');
    }

    await this.db
      .update(schema.documentVersions)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(schema.documentVersions.id, targetVersion.id));

    this.logger.debug(
      `Version [${targetVersion.versionNumber}] soft deleted for the document [${documentId}]`,
    );

    await this.db.delete(schema.chunks).where(eq(schema.chunks.versionId, targetVersion.id));

    if (existingDoc.versions.length === 1) {
      await this.db.update(schema.documents).set({
        deletedAt: new Date(),
      });
    }
  }

  /**
   * @description removes a document version.
   * @param documentId document id
   * @param userId user id
   * @param versionId version id to remove
   */
  async removeVersion(
    documentId: string,
    userId: string,
    versionId: string,
    workspaceId: string,
  ): Promise<void> {
    const existingDoc = await this.findOneWithVersions(documentId, userId);

    if (existingDoc.workspaceId !== workspaceId) {
      this.logger.error(
        `The document [${existingDoc.id}] does not belong to the workspace [${workspaceId}]`,
      );
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    const targetVersion = existingDoc.versions.find((v) => v.id === versionId);

    if (!targetVersion) {
      this.logger.error(
        `error finding version ${versionId} for document ${documentId} and user ${userId}`,
      );
      throw new NotFoundException('Version not found');
    }

    if (!targetVersion.deletedAt) {
      this.logger.error(
        `Version [${targetVersion.versionNumber}] of document [${documentId}] has not been marked for deletion`,
      );
      throw new ForbiddenException('Version has not been marked for deletion');
    }

    await this.db
      .delete(schema.documentVersions)
      .where(eq(schema.documentVersions.id, targetVersion.id));

    this.logger.debug(
      `Version [${targetVersion.versionNumber}] deleted for the document [${documentId}]`,
    );
    this.logger.log(`storageKey: ${targetVersion.storageKey}`);

    if (existingDoc.versions.length === 1) {
      await this.db.update(schema.documents).set({
        deletedAt: new Date(),
      });
    }

    await this.storage.deleteFile(targetVersion.storageKey);
  }

  /**
   * @description restores a document version. And recreates embeddings if the version was soft deleted.
   * @param documentId document id
   * @param userId user id
   * @param versionId version id to restore
   * @param workspaceId workspace id
   */
  async restoreVersion(
    documentId: string,
    userId: string,
    versionId: string,
    workspaceId: string,
  ): Promise<void> {
    const existingDoc = await this.findOneWithVersions(documentId, userId);

    if (existingDoc.workspaceId !== workspaceId) {
      this.logger.error(
        `The document [${existingDoc.id}] does not belong to the workspace [${workspaceId}]`,
      );
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    const targetVersion = existingDoc.versions.find((v) => v.id === versionId);

    if (!targetVersion) {
      this.logger.error(
        `error finding version ${versionId} for document ${documentId} and user ${userId}`,
      );
      throw new NotFoundException('Version not found');
    }

    if (!targetVersion.deletedAt) {
      this.logger.error(
        `Version [${targetVersion.versionNumber}] of document [${documentId}] has not been marked for deletion`,
      );
      throw new ForbiddenException('Version has not been marked for deletion');
    }

    await this.db
      .update(schema.documentVersions)
      .set({
        deletedAt: null,
      })
      .where(eq(schema.documentVersions.id, targetVersion.id));

    const file = await this.storage.download(targetVersion.storageKey);
    const mimeType = this.resolveMimeType(existingDoc.mimeType, targetVersion.storageKey);

    await this.storeChunks(file, mimeType, workspaceId, targetVersion.id);
    this.logger.debug(
      `Version [${targetVersion.versionNumber}] restored for the document [${documentId}]`,
    );
  }

  /**
   * @description extract the content of a file into a string
   * @param fileBuffer
   * @param mimeType
   * @returns
   */
  private extractContent(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const parser = this.parserFactory.getParser(mimeType);
    return parser.parse(fileBuffer);
  }

  /**
   * @description resolves the mime type of a file based on its mimetype and filename
   * @param mimetype
   * @param filename
   * @returns
   */
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

  async getVersionContent(
    id: string,
    versionId: string,
    userId: string,
  ): Promise<{ content: string; mimeType: string }> {
    const document = await this.findOneWithVersions(id, userId);

    const version = document.versions.find((v) => v.id === versionId);
    if (!version) {
      this.logger.error(`Version [${versionId}] not found for document [${id}]`);
      throw new NotFoundException('Version not found');
    }

    if (version.deletedAt) {
      this.logger.error(`Version [${versionId}] has been deleted (in the trash)`);
      throw new NotFoundException('Version not found');
    }

    const buffer = await this.storage.download(version.storageKey);
    const content = await this.extractContent(buffer, document.mimeType);
    return {
      content,
      mimeType: document.mimeType,
    };
  }

  async getVersionFile(
    id: string,
    versionId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const document = await this.findOneWithVersions(id, userId);

    if (document.deletedAt) {
      this.logger.error(`Document [${id}] has been deleted (in the trash)`);
      throw new NotFoundException('Document not found');
    }

    const version = document.versions.find((v) => v.id === versionId);
    if (!version) {
      this.logger.error(`Version [${versionId}] not found for document [${id}]`);
      throw new NotFoundException('Version not found');
    }

    const buffer = await this.storage.download(version.storageKey);
    return {
      buffer,
      mimeType: document.mimeType,
      filename: version.storageKey.split('/').pop() || 'document',
    };
  }

  /**
   * @description store chunks of a document in the database
   * @param file file to store chunks from
   * @param documentId document id
   * @param versionId version id
   */
  private async storeChunks(
    fileBuffer: Buffer,
    mimeType: string,
    workspaceId: string,
    versionId: string,
  ): Promise<void> {
    const text = await this.extractContent(fileBuffer, mimeType);
    const chunks = this.chunkerService.chunkText(text);

    if (chunks.length === 0) return;

    const textsToEmbed: string[] = chunks.map((chunk) => chunk.content);
    const embeddings: number[][] = await this.ollamaService.generateEmbeddings(textsToEmbed);

    const valuesToInsert = chunks.map((chunk, index) => ({
      workspaceId,
      versionId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: embeddings[index],
    }));

    await this.db.insert(schema.chunks).values(valuesToInsert);

    this.logger.debug(
      `Chunks et vecteurs stockés pour la version [${versionId}], ${chunks.length} chunks insérés.`,
    );
  }

  /**
   * @description Ensures that chunks exist for the specified version IDs.
   * If any version is missing chunks, it downloads the file and generates chunks and embeddings.
   * @param versionIds Array of version IDs to check
   */
  async ensureChunksExist(versionIds: string[]): Promise<void> {
    if (!versionIds || versionIds.length === 0) return;

    const existingChunkVersions = await this.db
      .selectDistinct({ versionId: schema.chunks.versionId })
      .from(schema.chunks)
      .where(inArray(schema.chunks.versionId, versionIds));

    const existingSet = new Set(existingChunkVersions.map((c) => c.versionId));
    const missingVersionIds = versionIds.filter((id) => !existingSet.has(id));

    if (missingVersionIds.length === 0) return;

    const versionsToChunk = await this.db.query.documentVersions.findMany({
      where: (versions, { inArray }) => inArray(versions.id, missingVersionIds),
      with: {
        document: {
          columns: {
            workspaceId: true,
            mimeType: true,
          },
        },
      },
    });

    await Promise.all(
      versionsToChunk.map(async (v) => {
        const file = await this.storage.download(v.storageKey);
        const mimeType = this.resolveMimeType(v.document.mimeType, v.storageKey);
        await this.storeChunks(file, mimeType, v.document.workspaceId, v.id);
      }),
    );
  }
}
