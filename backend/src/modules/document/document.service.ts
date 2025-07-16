import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';

import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { PineconeService } from './pipecone.service';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PineconeStore } from '@langchain/pinecone';
import { extractText } from 'src/utils/extract';
import { UploadedFile } from 'src/types/file.type';
import { ConfigService } from '@nestjs/config';
import { Document, Conversation, Message, MessageRole } from './entities';

export interface StructuredDocument {
  title: string;
  summary: string;
  keywords: string[];
  sections: Array<{ heading: string; content: string }>;
}

@Injectable()
export class DocumentService {
  private openaiApiKey: string;
  private openai: ChatOpenAI;

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private readonly pineconeService: PineconeService,
    private readonly configService: ConfigService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY')!;

    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    this.openai = new ChatOpenAI({
      openAIApiKey: this.openaiApiKey,
      modelName: 'gpt-4',
      temperature: 0.7,
    });
  }

  async uploadFile(file: UploadedFile) {
    try {
      const filePath = path.resolve(file.path);
      const rawText = await extractText(filePath, file.mimetype);

      const structured = await this.structureTextFromDocument(rawText);

      const embedding = new OpenAIEmbeddings({
        openAIApiKey: this.openaiApiKey,
      });

      const vectors = await embedding.embedQuery(rawText);

      const safeFilename = Buffer.from(file.originalname, 'utf8')
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '_');

      const vectorId = `doc_${safeFilename}_${+new Date()}`;

      const vector = {
        id: vectorId,
        values: vectors,
        metadata: {
          filename: file.originalname,
          title: structured.title,
          summary: structured.summary,
          keywords: structured.keywords.join(', '),
          text: rawText.slice(0, 300),
        },
      };

      const index = this.pineconeService.getIndex();
      await index.upsert([vector]);

      const document = this.documentRepository.create({
        filename: `${file.originalname}-${+new Date()}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        title: structured.title,
        summary: structured.summary,
        keywords: structured.keywords,
        vectorId: vectorId,
        extractedText: rawText.slice(0, 500),
      });

      const savedDocument = await this.documentRepository.save(document);

      const conversation = await this.createDocumentConversation(savedDocument);

      return {
        status: 'uploaded',
        filename: file.originalname,
        vectorId: vector.id,
        documentId: savedDocument.id,
        conversationId: conversation.id,
        structure: structured,
      };
    } catch (error) {
      console.error(error);
      throw new HttpException(
        'Upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async structureTextFromDocument(
    raw: string,
  ): Promise<StructuredDocument> {
    const STRUCTURE_PROMPT = PromptTemplate.fromTemplate(`
      You are given a raw document content. Extract and return JSON with this schema:
      {{
        "title": string,
        "summary": string,
        "keywords": string[],
        "sections": [[{{heading}}: string, {{content}}: string]]
      }}
      
      Raw document:
      """
      {document}
      """
    `);

    const chain = RunnableSequence.from([STRUCTURE_PROMPT, this.openai]);

    const resp = await chain.invoke({ document: raw });

    return JSON.parse(resp.text) as StructuredDocument;
  }

  private async createDocumentConversation(
    document: Document,
  ): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      title: `Q&A for ${document.originalName}`,
      documentId: document.id,
    });

    const savedConversation =
      await this.conversationRepository.save(conversation);

    await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: savedConversation.id,
        role: MessageRole.SYSTEM,
        content: `Document uploaded: ${document.originalName}
          Title: ${document.title}
          Summary: ${document.summary}
          Keywords: ${document.keywords?.join(', ')}

          You can now ask questions about this document.`,
      }),
    );

    return savedConversation;
  }

  async queryWithConversation(
    question: string,
    conversationId?: string,
    documentId?: string,
  ) {
    try {
      let conversation: Conversation | null;

      if (conversationId) {
        conversation = await this.conversationRepository.findOne({
          where: { id: conversationId, isActive: true },
          relations: ['document'],
        });

        if (!conversation) {
          throw new HttpException(
            'Conversation not found',
            HttpStatus.NOT_FOUND,
          );
        }
      } else if (documentId) {
        conversation = await this.conversationRepository.findOne({
          where: { documentId, isActive: true },
          relations: ['document'],
        });

        if (!conversation) {
          const document = await this.documentRepository.findOne({
            where: { id: documentId, isActive: true },
          });

          if (!document) {
            throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
          }

          conversation = await this.createDocumentConversation(document);
        }
      } else {
        throw new HttpException(
          'Either conversationId or documentId must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const questionMessage = await this.messageRepository.save(
        this.messageRepository.create({
          conversationId: conversation.id,
          role: MessageRole.USER,
          content: question,
        }),
      );

      const previousMessages = await this.messageRepository.find({
        where: { conversationId: conversation.id },
        order: { createdAt: 'ASC' },
        take: 10,
      });

      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.openaiApiKey,
      });

      const index = this.pineconeService.getIndex();

      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: index,
        textKey: 'text',
      });

      let retriever;
      if (conversation.document) {
        retriever = vectorStore.asRetriever({
          filter: { filename: conversation.document.originalName },
        });
      } else {
        retriever = vectorStore.asRetriever();
      }

      const conversationHistory = previousMessages
        .filter((msg) => msg.role !== MessageRole.SYSTEM)
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n');

      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are a helpful assistant answering questions based on document content and conversation history.
        
          Document Information:
          ${
            conversation.document
              ? `
          - Title: ${conversation.document.title}
          - Summary: ${conversation.document.summary}
          - Keywords: ${conversation.document.keywords?.join(', ')}
          `
              : 'No specific document context available.'
          }

          Previous conversation:
          {conversationHistory}

          Answer the current question based on the provided context and previous conversation.`,
        ],
        [
          'human',
          'Context from documents:\n{context}\n\nCurrent Question:\n{question}',
        ],
      ]);

      const chain = RunnableSequence.from([
        async (input: { question: string }) => {
          const docs = await retriever.invoke(input.question);
          const context = docs.map((doc) => doc.pageContent).join('\n\n');
          return {
            question: input.question,
            context,
            conversationHistory,
          };
        },
        prompt,
        this.openai,
      ]);

      const result = await chain.invoke({ question });
      const answer = result.content as string;

      await this.messageRepository.save(
        this.messageRepository.create({
          conversationId: conversation.id,
          role: MessageRole.ASSISTANT,
          content: answer,
          parentId: questionMessage.id,
        }),
      );

      conversation.updatedAt = new Date();
      await this.conversationRepository.save(conversation);

      return {
        conversationId: conversation.id,
        documentId: conversation.documentId,
        question,
        answer,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Query error:', error);
      throw new HttpException('Query failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getConversationMessages(conversationId: string) {
    try {
      const conversation = await this.conversationRepository.findOne({
        where: { id: conversationId, isActive: true },
        relations: ['document'],
      });

      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      const allMessages = await this.messageRepository.find({
        where: { conversationId },
        order: { createdAt: 'ASC' },
      });

      const systemMessages = allMessages.filter(
        (msg) => msg.role === MessageRole.SYSTEM,
      );

      const userAndAssistantMessages = allMessages.filter(
        (msg) => msg.role !== MessageRole.SYSTEM,
      );

      const questionAnswerPairs: Array<{
        question: ReturnType<typeof this.mapMessageToDto>;
        answer?: ReturnType<typeof this.mapMessageToDto>;
        createdAt: Date;
      }> = [];
      const userMessages = userAndAssistantMessages.filter(
        (msg) => msg.role === MessageRole.USER,
      );

      for (const userMessage of userMessages) {
        const assistantMessage = userAndAssistantMessages.find(
          (msg) =>
            msg.role === MessageRole.ASSISTANT &&
            msg.parentId === userMessage.id,
        );

        questionAnswerPairs.push({
          question: this.mapMessageToDto(userMessage),
          answer: assistantMessage
            ? this.mapMessageToDto(assistantMessage)
            : undefined,
          createdAt: userMessage.createdAt,
        });
      }

      questionAnswerPairs.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      return {
        conversationId: conversation.id,
        title: conversation.title,
        documentId: conversation.documentId,
        document: conversation.document
          ? {
              id: conversation.document.id,
              originalName: conversation.document.originalName,
              title: conversation.document.title,
            }
          : undefined,
        messageCount: allMessages.length,
        systemMessages: systemMessages.map((msg) => this.mapMessageToDto(msg)),
        questionAnswerPairs,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    } catch (error) {
      console.error('Get conversation messages error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get conversation messages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapMessageToDto(message: Message) {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      parentId: message.parentId,
    };
  }

  async getAllDocuments(searchQuery?: {
    keyword?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    try {
      const queryBuilder = this.documentRepository
        .createQueryBuilder('document')
        .leftJoinAndSelect('document.conversation', 'conversation')
        .where('document.isActive = :isActive', { isActive: true });

      if (searchQuery?.keyword) {
        const keyword = `%${searchQuery.keyword.toLowerCase()}%`;
        queryBuilder.andWhere(
          '(LOWER(document.originalName) LIKE :keyword OR ' +
            'LOWER(document.title) LIKE :keyword OR ' +
            'LOWER(document.summary) LIKE :keyword OR ' +
            'LOWER(document.extractedText) LIKE :keyword OR ' +
            'LOWER(document.keywords) LIKE :keyword)',
          { keyword },
        );
      }

      const sortBy = searchQuery?.sortBy || 'createdAt';
      const sortOrder = searchQuery?.sortOrder === 'ASC' ? 'ASC' : 'DESC';

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        queryBuilder.orderBy(`document.${sortBy}`, sortOrder);
      } else if (sortBy === 'title') {
        queryBuilder.orderBy('document.title', sortOrder);
      } else if (sortBy === 'originalName') {
        queryBuilder.orderBy('document.originalName', sortOrder);
      } else {
        queryBuilder.orderBy('document.createdAt', 'DESC');
      }

      const documents = await queryBuilder.getMany();

      const documentsWithConversations = await Promise.all(
        documents.map(async (document) => {
          let conversationData: {
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
          } | null = null;

          if (document.conversation) {
            const messageCount = await this.messageRepository.count({
              where: { conversationId: document.conversation.id },
            });

            conversationData = {
              id: document.conversation.id,
              title: document.conversation.title,
              messageCount,
              createdAt: document.conversation.createdAt,
              updatedAt: document.conversation.updatedAt,
            };
          }

          return {
            id: document.id,
            filename: document.filename,
            originalName: document.originalName,
            mimeType: document.mimeType,
            title: document.title,
            summary: document.summary,
            keywords: document.keywords || [],
            extractedText:
              document.extractedText?.slice(0, 200) +
              (document.extractedText && document.extractedText.length > 200
                ? '...'
                : ''),
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
            conversation: conversationData,
          };
        }),
      );

      return {
        documents: documentsWithConversations,
        total: documentsWithConversations.length,
        searchKeyword: searchQuery?.keyword,
      };
    } catch (error) {
      console.error('Get all documents error:', error);
      throw new HttpException(
        'Failed to get documents',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
