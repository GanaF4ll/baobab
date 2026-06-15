import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '../.env.dev' });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export default defineConfig({
  out: './drizzle',
  schema: './src/drizzle/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url },
});
