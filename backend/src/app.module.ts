import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from './drizzle/drizzle.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { DocumentsModule } from './documents/documents.module';
import { StorageModule } from './shared/storage/storage.module';
import { OllamaModule } from './ollama/ollama.module';
import { RagModule } from './rag/rag.module';
import { ConversationsModule } from './conversations/conversations.module';

@Module({
  imports: [
    DrizzleModule,
    UsersModule,
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DocumentsModule,
    StorageModule,
    OllamaModule,
    RagModule,
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
