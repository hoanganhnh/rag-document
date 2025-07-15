import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { PineconeService } from './pipecone.service';
import { Document } from '../search/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  controllers: [DocumentController],
  providers: [DocumentService, PineconeService],
  exports: [DocumentService, PineconeService],
})
export class DocumentModule {}
