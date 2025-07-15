import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, Message, MessageRole } from './entities';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async createConversation(
    title: string,
    documentId?: string,
  ): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      title,
      documentId,
    });
    return this.conversationRepository.save(conversation);
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, isActive: true },
      relations: ['messages', 'document'],
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with id ${conversationId} not found`,
      );
    }

    return conversation;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    // Verify conversation exists
    await this.getConversation(conversationId);
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async createMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
  ): Promise<Message> {
    await this.getConversation(conversationId);

    const message = this.messageRepository.create({
      conversationId,
      role,
      content,
    });

    return this.messageRepository.save(message);
  }

  async getAllConversations(): Promise<Conversation[]> {
    return this.conversationRepository.find({
      where: { isActive: true },
      relations: ['document'],
      order: { updatedAt: 'DESC' },
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    conversation.isActive = false;
    await this.conversationRepository.save(conversation);
  }
}
