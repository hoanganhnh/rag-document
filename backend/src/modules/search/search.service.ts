import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';

import { PineconeService } from '../document/pipecone.service';
import { Conversation, Document, Message, MessageRole } from './entities';
import { QueryDto } from './dto/query.dto';
import { ConversationService } from './conversation.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private pineconeService: PineconeService,
    private conversationService: ConversationService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async search(queryDto: QueryDto): Promise<{
    answer: string;
    conversationId: string;
    sources: any[];
  }> {
    const { question, conversationId } = queryDto;

    let chatHistory = '';
    let conversation: Conversation | undefined;

    if (conversationId) {
      conversation =
        await this.conversationService.getConversation(conversationId);
      const messages =
        await this.conversationService.getConversationMessages(conversationId);
      chatHistory = messages
        .slice(-10) // Last 10 messages for context
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');
    }

    const embedding = await this.generateEmbedding(question);

    const index = this.pineconeService.getIndex();
    const searchResults = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    // Retrieve relevant text chunks
    const context = searchResults.matches
      .map((match) => match.metadata?.text || '')
      .filter(Boolean)
      .join('\n\n');

    // Generate response using OpenAI
    const answer = await this.generateResponse(question, context, chatHistory);

    // Save or create conversation
    if (conversationId) {
      // Add user question
      await this.conversationService.createMessage(
        conversationId,
        MessageRole.USER,
        question,
      );
      // Add assistant response
      await this.conversationService.createMessage(
        conversationId,
        MessageRole.ASSISTANT,
        answer,
      );
    } else {
      // Create new conversation
      conversation = await this.conversationService.createConversation(
        question.slice(0, 50) + '...',
      );
      // Add user question
      await this.conversationService.createMessage(
        conversation.id,
        MessageRole.USER,
        question,
      );
      // Add assistant response
      await this.conversationService.createMessage(
        conversation.id,
        MessageRole.ASSISTANT,
        answer,
      );
    }

    return {
      answer,
      conversationId: conversation?.id || conversationId || '',
      sources: searchResults.matches.map((match) => ({
        score: match.score,
        text:
          typeof match.metadata?.text === 'string'
            ? match.metadata.text.slice(0, 200) + '...'
            : '',
        metadata: match.metadata,
      })),
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
      throw error;
    }
  }

  private async generateResponse(
    question: string,
    context: string,
    chatHistory: string,
  ): Promise<string> {
    try {
      const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context. 
Use the context to provide accurate and relevant answers. If the context doesn't contain enough information to answer the question, say so.

Context: ${context}

${chatHistory ? `Chat History:\n${chatHistory}` : ''}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return (
        response.choices[0]?.message?.content ||
        'Sorry, I could not generate a response.'
      );
    } catch (error) {
      this.logger.error('Error generating response:', error);
      throw error;
    }
  }
}
