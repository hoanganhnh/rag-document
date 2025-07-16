import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { MessageRole } from '../entities';

export class QueryDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  documentId?: string;
}

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  documentId?: string;
}

export class CreateMessageDto {
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(MessageRole)
  role: MessageRole;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AskQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  documentId?: string;

  @IsString()
  @IsOptional()
  conversationTitle?: string;
}

export class QuestionAnswerResponseDto {
  question: string;
  answer: string;
  conversationId: string;
  documentId?: string;
  sources: SourceDto[];
  context: string[];
  tokensUsed?: number;
  responseTime?: number;
}

export class SourceDto {
  score: number;
  text: string;
  documentId?: string;
  chunkId?: string;
  metadata?: any;
}

export class ConversationSummaryDto {
  id: string;
  title: string;
  documentId?: string;
  documentTitle?: string;
  messageCount: number;
  lastMessage?: string;
  lastActivity: Date;
  createdAt: Date;
}

export class QueryWithConversationDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @IsUUID()
  @IsOptional()
  documentId?: string;
}

export class ConversationResponseDto {
  conversationId: string;
  documentId?: string;
  question: string;
  answer: string;
  timestamp: Date;
}

export class ConversationHistoryDto {
  id: string;
  title: string;
  documentId?: string;
  document?: {
    id: string;
    originalName: string;
    title?: string;
  };
  lastMessage?: {
    content: string;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class MessageDto {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;
}

export class QuestionAnswerPairDto {
  question: MessageDto;
  answer?: MessageDto;
  createdAt: Date;
}

export class ConversationMessagesResponseDto {
  conversationId: string;
  title: string;
  documentId?: string;
  document?: {
    id: string;
    originalName: string;
    title?: string;
  };
  messageCount: number;
  systemMessages: MessageDto[];
  questionAnswerPairs: QuestionAnswerPairDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentSearchQueryDto {
  @IsString()
  @IsOptional()
  keyword?: string;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'originalName';

  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}

export class DocumentWithConversationDto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  title?: string;
  summary?: string;
  keywords: string[];
  extractedText?: string;
  createdAt: Date;
  updatedAt: Date;
  conversation?: {
    id: string;
    title: string;
    messageCount: number;
    lastMessage?: {
      content: string;
      role: MessageRole;
      createdAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export class DocumentsListResponseDto {
  documents: DocumentWithConversationDto[];
  total: number;
  searchKeyword?: string;
}
