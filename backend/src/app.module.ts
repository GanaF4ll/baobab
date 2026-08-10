import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DocumentsModule } from './documents/documents.module';
import { DrizzleModule } from './drizzle/drizzle.module';
import { OllamaModule } from './ollama/ollama.module';
import { RagModule } from './rag/rag.module';
import { StorageModule } from './shared/storage/storage.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { TrashModule } from './trash/trash.module';

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
    WorkspacesModule,
    TrashModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
