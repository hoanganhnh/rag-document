import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone, Index } from '@pinecone-database/pinecone';

@Injectable()
export class PineconeService implements OnModuleInit {
  private pineconeApiKey: string;
  private pineconeIndexName: string;

  private pinecone!: Pinecone;
  private index!: Index;

  constructor(private readonly configService: ConfigService) {
    this.pineconeApiKey = this.configService.get<string>('PINECONE_API_KEY')!;
    this.pineconeIndexName = this.configService.get<string>(
      'PINECONE_INDEX_NAME',
    )!;

    if (!this.pineconeApiKey) {
      throw new Error('PINECONE_API_KEY is not set');
    }

    if (!this.pineconeIndexName) {
      throw new Error('PINECONE_INDEX_NAME is not set');
    }
  }

  onModuleInit() {
    this.pinecone = new Pinecone({ apiKey: this.pineconeApiKey });
    this.index = this.pinecone.index(this.pineconeIndexName);
  }

  getIndex(): Index {
    if (!this.index) throw new Error('Pinecone index is not initialized');
    return this.index;
  }
}
