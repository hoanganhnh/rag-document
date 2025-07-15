import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ConversationService } from './conversation.service';
import { QAService } from './qa.service';
import { PineconeService } from '../document/pipecone.service';
import { Document, Message, Conversation } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Conversation, Message]),
    ConfigModule,
  ],
  controllers: [SearchController],
  providers: [SearchService, ConversationService, QAService, PineconeService],
  exports: [SearchService, ConversationService, QAService],
})
export class SearchModule {}
