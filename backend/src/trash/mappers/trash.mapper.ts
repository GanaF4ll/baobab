import { TrashItemDto, TrashItemMetadataDto } from '../dto/output/trash-response.dto';

const TRASH_RETENTION_DAYS = 30;

export interface RawTrashRow {
  id: string;
  type: string;
  title: string;
  workspaceId: string | null;
  workspaceName: string | null;
  deletedAt: Date | null;
  icon: string | null;
}

export class TrashMapper {
  /**
   * Maps raw union rows to TrashItemDto[], enriching each item
   * with expiresAt and type-specific metadata.
   */
  static toDto(
    items: RawTrashRow[],
    documentMetaMap: Map<string, string>,
    conversationMetaMap: Map<string, number>,
  ): TrashItemDto[] {
    return items.map((item) => {
      const deletedAt = item.deletedAt ?? new Date();
      const expiresAt = new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      let metadata: TrashItemMetadataDto | undefined;

      if (item.type === 'document') {
        const mimeType = documentMetaMap.get(item.id);
        if (mimeType) {
          metadata = { mimeType: mimeType as TrashItemMetadataDto['mimeType'] };
        }
      } else if (item.type === 'conversation') {
        const messageCount = conversationMetaMap.get(item.id) ?? 0;
        metadata = { messageCount };
      } else if (item.type === 'workspace') {
        metadata = { icon: item.icon };
      }

      const dto: TrashItemDto = {
        id: item.id,
        type: item.type as TrashItemDto['type'],
        title: item.title,
        deletedAt: deletedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        ...(item.workspaceId && { workspaceId: item.workspaceId }),
        ...(item.workspaceName && { workspaceName: item.workspaceName }),
        ...(metadata && { metadata }),
      };

      return dto;
    });
  }
}
