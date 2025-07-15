import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column('text', { nullable: true })
  title: string;

  @Column('text', { nullable: true })
  summary: string;

  @Column('simple-array', { nullable: true })
  keywords: string[];

  @Column()
  vectorId: string;

  @Column('text', { nullable: true })
  extractedText: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Conversation, (conversation) => conversation.document)
  conversation: Conversation;
}
