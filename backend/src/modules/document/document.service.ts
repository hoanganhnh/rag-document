import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { PineconeService } from './pipecone.service';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PineconeStore } from '@langchain/pinecone';
import { extractText } from 'src/utils/extract';
import { structureText } from 'src/utils/structure';
import { UploadedFile } from 'src/types/file.type';
import { ConfigService } from '@nestjs/config';
import { Document } from '../search/entities';

@Injectable()
export class DocumentService {
  private openaiApiKey: string;

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
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

      const vector = {
        id: `${file.originalname}-${+new Date()}`,
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
        vectorId: vector.id,
        extractedText: rawText.slice(0, 500),
      });

      const savedDocument = await this.documentRepository.save(document);

      fs.writeFileSync(
        `rag-data/${file.originalname}-${+new Date()}.json`,
        JSON.stringify(structured, null, 2),
      );
      fs.unlinkSync(filePath);

      return {
        status: 'uploaded',
        filename: file.originalname,
        vectorId: vector.id,
        documentId: savedDocument.id,
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

  async query(question: string) {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.openaiApiKey,
    });

    const index = this.pineconeService.getIndex();

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      textKey: 'text',
    });

    const retriever = vectorStore.asRetriever();

    const model = new ChatOpenAI({
      modelName: 'gpt-4',
      openAIApiKey: this.openaiApiKey,
      temperature: 0.7,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', 'You are a helpful assistant answering based on context.'],
      ['human', 'Context:\n{context}\n\nQuestion:\n{question}'],
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

    return { question, answer: result.content };
  }
}
