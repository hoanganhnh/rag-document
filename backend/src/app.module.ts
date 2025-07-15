import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { DocumentModule } from './modules/document/document.module';
import { SearchModule } from './modules/search/search.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DocumentModule,
    SearchModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
