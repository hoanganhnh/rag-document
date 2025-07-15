import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

import { DocumentService } from './document.service';
import {
  ConversationResponseDto,
  QueryWithConversationDto,
} from './dtos/query.dto';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

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
}
