import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from './drizzle/drizzle.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DrizzleModule, UsersModule, AuthModule, ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
