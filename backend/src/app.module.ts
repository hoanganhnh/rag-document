import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { DocumentModule } from './modules/document/document.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DocumentModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
