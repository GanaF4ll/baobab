import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

//* ─── Enums ───────────────────────────────────────────────────────────────────

export const mimeTypeEnum = pgEnum('mime_type', ['application/pdf', 'text/markdown']);

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

export const llmModelStatusEnum = pgEnum('model_status', [
  'not_downloaded',
  'downloading',
  'ready',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// export const workspaces = pgTable('workspaces', {
//   id: uuid('id').primaryKey().defaultRandom(),
//   name: text('name').notNull(),
//   description: text('description'),
//   ownerId: uuid('owner_id')
//     .notNull()
//     .references(() => users.id, { onDelete: 'cascade' }),
//   createdAt: timestamp('created_at').notNull().defaultNow(),
//   updatedAt: timestamp('updated_at').notNull().defaultNow(),
// });

// export const workspaceMembers = pgTable('workspace_members', {
//   id: uuid('id').primaryKey().defaultRandom(),
//   workspaceId: uuid('workspace_id')
//     .notNull()
//     .references(() => workspaces.id, { onDelete: 'cascade' }),
//   userId: uuid('user_id')
//     .notNull()
//     .references(() => users.id, { onDelete: 'cascade' }),
//   createdAt: timestamp('created_at').notNull().defaultNow(),
//   updatedAt: timestamp('updated_at').notNull().defaultNow(),
// });

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  mimeType: mimeTypeEnum('mime_type').notNull(),
  currentVersion: integer('current_version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  storageKey: text('storage_key').notNull(),
  changeSummary: text('change_summary'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * @description A chunk is a text fragment of a document.
 * A chunk is used for semantic search and RAG.
 */
export const chunks = pgTable(
  'chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    versionId: uuid('version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 768 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('chunks_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
    index('chunks_document_id_idx').on(table.documentId),
  ],
);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  sources: jsonb('sources'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const llmModels = pgTable('llm_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  status: llmModelStatusEnum('status').notNull().default('not_downloaded'),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  conversations: many(conversations),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  versions: many(documentVersions),
  chunks: many(chunks),
  conversations: many(conversations),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one, many }) => ({
  document: one(documents, { fields: [documentVersions.documentId], references: [documents.id] }),
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, { fields: [chunks.documentId], references: [documents.id] }),
  version: one(documentVersions, { fields: [chunks.versionId], references: [documentVersions.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  document: one(documents, { fields: [conversations.documentId], references: [documents.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
