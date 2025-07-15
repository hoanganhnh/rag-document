import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { PineconeService } from './pipecone.service';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PineconeStore } from '@langchain/pinecone';
import { extractText } from 'src/utils/extract';
import { structureText } from 'src/utils/structure';
import { UploadedFile } from 'src/types/file.type';
import { ConfigService } from '@nestjs/config';
import { Document, Conversation, Message, MessageRole } from './entities';

@Injectable()
export class DocumentService {
  private openaiApiKey: string;

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
  }

  async uploadFile(file: UploadedFile) {
    try {
      const filePath = path.resolve(file.path);
      const rawText = await extractText(filePath, file.mimetype);

      const structured = await structureText(rawText);

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

      // Create initial conversation for the document
      const conversation = await this.createDocumentConversation(savedDocument);

      fs.unlinkSync(filePath);

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

      const model = new ChatOpenAI({
        modelName: 'gpt-4',
        openAIApiKey: this.openaiApiKey,
        temperature: 0.7,
      });

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
          ${conversationHistory}

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
          return { question: input.question, context };
        },
        prompt,
        model,
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
}
