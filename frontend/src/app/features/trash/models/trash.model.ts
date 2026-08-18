export type TrashItemType = 'workspace' | 'document' | 'conversation';

export type RessourceTypeFilter = 'Workspace' | 'Document' | 'Conversation';

export interface TrashItemMetadata {
  mimeType?: string;
  messageCount?: number;
  icon?: string | null;
}

export interface TrashItem {
  id: string;
  type: TrashItemType;
  title: string;
  deletedAt: string;
  expiresAt: string;
  workspaceId?: string;
  workspaceName?: string;
  metadata?: TrashItemMetadata;
}

export interface TrashCollectionResponse {
  data: {
    items: TrashItem[];
    totalCount: number;
    nextCursor: string | null;
  };
}
