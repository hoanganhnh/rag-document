import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';

import { PineconeService } from '../document/pipecone.service';
import { Conversation, Document, MessageRole } from './entities';
import { ConversationService } from './conversation.service';
import {
  AskQuestionDto,
  QuestionAnswerResponseDto,
  SourceDto,
} from './dto/query.dto';

@Injectable()
export class QAService {
  private readonly logger = new Logger(QAService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private pineconeService: PineconeService,
    private conversationService: ConversationService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  async askQuestion(
    askQuestionDto: AskQuestionDto,
  ): Promise<QuestionAnswerResponseDto> {
    const startTime = Date.now();
    const { question, conversationId, documentId, conversationTitle } =
      askQuestionDto;

    this.logger.log(`Processing question: "${question.substring(0, 50)}..."`);

    let conversation: Conversation;
    if (conversationId) {
      conversation =
        await this.conversationService.getConversation(conversationId);
    } else {
      const title =
        conversationTitle || this.generateConversationTitle(question);
      conversation = await this.conversationService.createConversation(
        title,
        documentId,
      );
    }

    let documentContext = '';
    let document: Document | undefined;
    if (conversation.documentId || documentId) {
      const docId = conversation.documentId || documentId;
      document =
        (await this.documentRepository.findOne({
          where: { id: docId, isActive: true },
        })) || undefined;

      if (document) {
        documentContext = `Document: ${document.title || document.originalName}\n`;
        if (document.summary) {
          documentContext += `Summary: ${document.summary}\n`;
        }
        if (document.extractedText && document.extractedText.length > 0) {
          documentContext += `Content preview: ${document.extractedText.substring(0, 500)}...\n`;
        }
      }
    }

    const conversationHistory = await this.getConversationHistory(
      conversation.id,
    );

    const embedding = await this.generateEmbedding(question);
    const searchResults = await this.searchRelevantContent(
      embedding,
      document?.vectorId,
    );

    const relevantChunks = searchResults.matches
      .filter((match) => (match.score || 0) > 0.7) // Filter by relevance score
      .map((match) => String(match.metadata?.text || ''))
      .filter(Boolean);

    const context = relevantChunks.join('\n\n');

    // Generate answer using OpenAI
    const { answer, tokensUsed } = await this.generateAnswer(
      question,
      context,
      documentContext,
      conversationHistory,
    );

    await this.conversationService.createMessage(
      conversation.id,
      MessageRole.USER,
      question,
    );
    await this.conversationService.createMessage(
      conversation.id,
      MessageRole.ASSISTANT,
      answer,
    );

    // Prepare sources
    const sources: SourceDto[] = searchResults.matches
      .filter((match) => match.score !== undefined)
      .map((match) => ({
        score: match.score!,
        text: this.truncateText(String(match.metadata?.text || ''), 200),
        documentId: document?.id,
        chunkId: String(match.id),
        metadata: match.metadata,
      }));

    const responseTime = Date.now() - startTime;

    this.logger.log(
      `Question answered in ${responseTime}ms, tokens used: ${tokensUsed}`,
    );

    return {
      question,
      answer,
      conversationId: conversation.id,
      documentId: document?.id,
      sources,
      context: relevantChunks.map((chunk) => this.truncateText(chunk, 300)),
      tokensUsed,
      responseTime,
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  private async searchRelevantContent(embedding: number[], vectorId?: string) {
    const index = this.pineconeService.getIndex();

    const queryOptions = {
      vector: embedding,
      topK: 5,
      includeMetadata: true,
      filter: {
        documentId: vectorId,
      },
    };

    if (vectorId) {
      queryOptions.filter = { documentId: vectorId };
    }

    return await index.query(queryOptions);
  }

  private async getConversationHistory(
    conversationId: string,
  ): Promise<string> {
    const messages =
      await this.conversationService.getConversationMessages(conversationId);

    // Get last 6 messages (3 Q&A pairs) for context
    const recentMessages = messages.slice(-6);

    return recentMessages
      .map(
        (msg) =>
          `${msg.role === MessageRole.USER ? 'Human' : 'Assistant'}: ${msg.content}`,
      )
      .join('\n');
  }

  private async generateAnswer(
    question: string,
    context: string,
    documentContext: string,
    conversationHistory: string,
  ): Promise<{ answer: string; tokensUsed: number }> {
    try {
      const systemPrompt = this.buildSystemPrompt(documentContext, context);
      const userPrompt = this.buildUserPrompt(question, conversationHistory);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.3,
        stream: false,
      });

      const answer =
        response.choices[0]?.message?.content ||
        'I apologize, but I could not generate a response.';
      const tokensUsed = response.usage?.total_tokens || 0;

      return { answer, tokensUsed };
    } catch (error) {
      this.logger.error('Error generating answer:', error);
      throw new Error('Failed to generate answer');
    }
  }

  private buildSystemPrompt(
    documentContext: string,
    relevantContext: string,
  ): string {
    return `
        You are an intelligent document assistant. Your role is to answer questions based on the provided 
        document content and relevant  context.
        ${documentContext ? `DOCUMENT INFORMATION:\n${documentContext}\n` : ''}

        RELEVANT CONTENT:
        ${relevantContext || 'No specific relevant content found.'}

        INSTRUCTIONS:
        1. Answer questions accurately based on the provided content
        2. If the information is not in the provided context, clearly state that
        3. Provide specific details and examples when available
        4. Keep responses clear, concise, and helpful
        5. If you reference specific information, indicate it comes from the document
        6. Maintain a professional and helpful tone
    `;
  }

  private buildUserPrompt(
    question: string,
    conversationHistory: string,
  ): string {
    let prompt = '';

    if (conversationHistory) {
      prompt += `CONVERSATION HISTORY:\n${conversationHistory}\n\n`;
    }

    prompt += `CURRENT QUESTION: ${question}`;

    return prompt;
  }

  private generateConversationTitle(question: string): string {
    const cleanQuestion = question.replace(/[?!.]+$/, '');
    return cleanQuestion.length > 50
      ? cleanQuestion.substring(0, 47) + '...'
      : cleanQuestion;
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  }
}
