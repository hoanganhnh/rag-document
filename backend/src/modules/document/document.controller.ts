import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

import { DocumentService } from './document.service';
import {
  ConversationResponseDto,
  QueryWithConversationDto,
  ConversationMessagesResponseDto,
  DocumentSearchQueryDto,
  DocumentsListResponseDto,
} from './dtos/query.dto';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Get all documents with their conversations and optional search
   * @param searchQuery - Optional search parameters (keyword, sortBy, sortOrder)
   * @returns List of documents with conversation details
   */
  @Get()
  async getAllDocuments(
    @Query() searchQuery: DocumentSearchQueryDto,
  ): Promise<DocumentsListResponseDto> {
    return this.documentService.getAllDocuments(searchQuery);
  }

  @Post('/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.documentService.uploadFile(file);
  }

  @Post('query')
  async queryDocument(
    @Body() queryDto: QueryWithConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.documentService.queryWithConversation(
      queryDto.question,
      queryDto.conversationId,
      queryDto.documentId,
    );
  }

  /**
   * Get all messages in a conversation grouped by question-answer pairs
   * @param conversationId - UUID of the conversation
   * @returns Conversation details with messages grouped in Q&A pairs
   */
  @Get('conversations/:conversationId/messages')
  async getConversationMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ): Promise<ConversationMessagesResponseDto> {
    return this.documentService.getConversationMessages(conversationId);
  }
}
