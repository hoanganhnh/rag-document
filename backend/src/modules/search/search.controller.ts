import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { ConversationService } from './conversation.service';
import { QAService } from './qa.service';
import {
  QueryDto,
  CreateConversationDto,
  AskQuestionDto,
  ConversationSummaryDto,
} from './dto/query.dto';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly conversationService: ConversationService,
    private readonly qaService: QAService,
  ) {}

  @Post('query')
  async search(@Body(ValidationPipe) queryDto: QueryDto) {
    return this.searchService.search(queryDto);
  }

  @Post('ask')
  async askQuestion(@Body(ValidationPipe) askQuestionDto: AskQuestionDto) {
    return this.qaService.askQuestion(askQuestionDto);
  }

  @Post('conversations')
  async createConversation(
    @Body(ValidationPipe) createConversationDto: CreateConversationDto,
  ) {
    return this.conversationService.createConversation(
      createConversationDto.title,
      createConversationDto.documentId,
    );
  }

  @Get('conversations')
  async getAllConversations(): Promise<ConversationSummaryDto[]> {
    const conversations = await this.conversationService.getAllConversations();

    const summaryPromises = conversations.map(async (conv) => {
      const messages = await this.conversationService.getConversationMessages(
        conv.id,
      );
      const lastMessage = messages[messages.length - 1];

      return {
        id: conv.id,
        title: conv.title,
        documentId: conv.documentId,
        documentTitle: conv.document?.title || conv.document?.originalName,
        messageCount: messages.length,
        lastMessage:
          lastMessage?.content.substring(0, 100) +
          (lastMessage?.content.length > 100 ? '...' : ''),
        lastActivity: conv.updatedAt,
        createdAt: conv.createdAt,
      };
    });

    return Promise.all(summaryPromises);
  }

  @Get('conversations/:conversationId')
  async getConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationService.getConversation(conversationId);
  }

  @Get('conversations/:conversationId/messages')
  async getConversationMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationService.getConversationMessages(conversationId);
  }
}
