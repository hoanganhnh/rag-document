import { API_URL } from '../lib/env';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  experimental_attachments?: Array<{
    name: string;
    contentType: string;
    url: string;
  }>;
}

export interface Conversation {
  id: string;
  title: string;
  documentId?: string;
  documentTitle?: string;
  messageCount: number;
  lastMessage?: string;
  lastActivity: Date;
  createdAt: Date;
}

export interface QuestionResponse {
  question: string;
  answer: string;
  conversationId: string;
  documentId?: string;
  sources: Array<{
    score: number;
    text: string;
    documentId?: string;
    chunkId?: string;
    metadata?: any;
  }>;
  context: string[];
  tokensUsed?: number;
  responseTime?: number;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  async uploadDocument(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/document/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    return response.json();
  }

  async queryDocument(question: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/document/query?q=${encodeURIComponent(question)}`);
    
    if (!response.ok) {
      throw new Error('Failed to query document');
    }

    return response.json();
  }

  async createConversation(title: string, documentId?: string): Promise<Conversation> {
    const response = await fetch(`${this.baseUrl}/search/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, documentId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }

    return response.json();
  }

  async getAllConversations(): Promise<Conversation[]> {
    const response = await fetch(`${this.baseUrl}/search/conversations`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }

    return response.json();
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    const response = await fetch(`${this.baseUrl}/search/conversations/${conversationId}/messages`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch conversation messages');
    }

    const messages = await response.json();
    return messages.map((msg: any) => ({
      id: msg.id,
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content,
      createdAt: new Date(msg.createdAt),
    }));
  }

  async askQuestion(question: string, conversationId?: string, documentId?: string, conversationTitle?: string): Promise<QuestionResponse> {
    const response = await fetch(`${this.baseUrl}/search/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        conversationId,
        documentId,
        conversationTitle,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to ask question');
    }

    return response.json();
  }

  async searchQuery(question: string, conversationId?: string, documentId?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/search/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        conversationId,
        documentId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to search');
    }

    return response.json();
  }
}

export const apiService = new ApiService(); 