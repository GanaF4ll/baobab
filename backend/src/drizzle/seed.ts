import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from 'dotenv';
import * as argon2 from 'argon2';

config({ path: '../.env.dev' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const pool = new Pool({ connectionString: databaseUrl, ssl: false });
const db = drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_USERS = [
  { email: 'alice@baobab.dev', firstName: 'Alice', lastName: 'Martin', password: 'Alice123!' },
  { email: 'bob@baobab.dev', firstName: 'Bob', lastName: 'Dupont', password: 'Bob123!' },
  { email: 'carol@baobab.dev', firstName: 'Carol', lastName: 'Bernard', password: 'Carol123!' },
  { email: 'david@baobab.dev', firstName: 'David', lastName: 'Leroy', password: 'David123!' },
  { email: 'emma@baobab.dev', firstName: 'Emma', lastName: 'Petit', password: 'Emma123!' },
];

const DOCUMENT_TITLES = [
  'Introduction à la biologie végétale',
  'Rapport annuel 2025',
  'Guide des bonnes pratiques Git',
  'Architecture microservices',
  'Analyse de données financières',
];

const MIME_TYPES: ('application/pdf' | 'text/markdown')[] = [
  'application/pdf',
  'text/markdown',
  'text/markdown',
  'application/pdf',
  'text/markdown',
];

const CONVERSATION_TITLES = [
  'Questions sur le chapitre 1',
  'Résumé du document',
  'Points clés à retenir',
  'Analyse approfondie',
  'Clarifications et définitions',
];

const USER_MESSAGES = [
  'Peux-tu me résumer ce document en quelques points ?',
  'Quels sont les éléments les plus importants à retenir ?',
  'Explique-moi la section principale de ce document.',
  'Y a-t-il des contradictions dans ce document ?',
  'Quelles sont les conclusions principales ?',
];

// ─── Seed function ────────────────────────────────────────────────────────────

async function seed() {
  const existingUser = await db.query.users.findFirst();
  if (existingUser) {
    console.log('✋ Des données existent déjà, seed annulé.');
    await pool.end();
    return;
  }

  console.log('🌱 Démarrage du seed...');

  // 1. Créer les modèles LLM s'ils n'existent pas
  const existingModel = await db.query.llmModels.findFirst();
  if (!existingModel) {
    const MOCK_MODELS = [
      { name: 'llama3:8b', status: 'ready' as const, sizeBytes: 4700000000 },
      { name: 'mistral:7b', status: 'not_downloaded' as const, sizeBytes: 4100000000 },
    ];
    for (const model of MOCK_MODELS) {
      await db.insert(schema.llmModels).values(model);
    }
    console.log('🤖 Modèles LLM par défaut créés.');
  }

  for (const mockUser of MOCK_USERS) {
    // 2. Créer l'utilisateur
    const [user] = await db
      .insert(schema.users)
      .values({ ...mockUser, passwordHash: await argon2.hash(mockUser.password) })
      .returning();
    console.log(`  ✅ Utilisateur créé : ${user.email}`);

    // 3. Créer un workspace par défaut pour l'utilisateur
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({
        name: `Workspace de ${mockUser.firstName}`,
        description: `Espace de travail par défaut pour ${mockUser.firstName} ${mockUser.lastName}`,
        ownerId: user.id,
      })
      .returning();
    console.log(`    💼 Workspace créé : ${workspace.name}`);

    // 4. Créer 5 documents pour cet utilisateur dans le workspace
    const createdDocuments: (typeof schema.documents.$inferSelect)[] = [];

    for (let i = 0; i < 5; i++) {
      const [doc] = await db
        .insert(schema.documents)
        .values({
          userId: user.id,
          title: DOCUMENT_TITLES[i],
          mimeType: MIME_TYPES[i],
          workspaceId: workspace.id,
          currentVersion: 3,
        })
        .returning();

      createdDocuments.push(doc);

      // Créer 3 versions pour le document
      const changeSummaries = [
        'Version initiale',
        'Correction des fautes et relecture',
        'Ajout de la conclusion et finalisation',
      ];
      for (let v = 1; v <= 3; v++) {
        await db.insert(schema.documentVersions).values({
          documentId: doc.id,
          versionNumber: v,
          storageKey: `uploads/${user.id}/${doc.id}/v${v}`,
          changeSummary: changeSummaries[v - 1],
        });
      }
    }

    console.log(`    📄 5 documents créés (avec 3 versions chacun) pour ${user.email}`);

    // 5. Créer 5 conversations pour cet utilisateur dans le workspace
    for (let i = 0; i < 5; i++) {
      const [conversation] = await db
        .insert(schema.conversations)
        .values({
          userId: user.id,
          workspaceId: workspace.id,
          title: CONVERSATION_TITLES[i],
        })
        .returning();

      // Ajouter 1 message utilisateur dans la conversation
      await db.insert(schema.messages).values({
        conversationId: conversation.id,
        role: 'user',
        content: USER_MESSAGES[i],
        sources: null,
      });
    }

    console.log(`    💬 5 conversations créées pour ${user.email}`);
  }

  console.log('\n✨ Seed terminé avec succès !');
  console.log('   → Modèles LLM par défaut');
  console.log('   → 5 utilisateurs');
  console.log('   → 1 workspace par utilisateur');
  console.log('   → 5 documents par utilisateur (+ 3 versions chacun)');
  console.log('   → 5 conversations par utilisateur (+ 1 message chacune)');

  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Erreur lors du seed :', err);
  pool.end();
  process.exit(1);
});
