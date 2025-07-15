import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { PineconeService } from './pipecone.service';
import { Conversation, Document, Message } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Conversation, Message])],
  controllers: [DocumentController],
  providers: [DocumentService, PineconeService],
  exports: [DocumentService, PineconeService],
})
export class DocumentModule {}
