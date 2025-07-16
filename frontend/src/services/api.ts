import { API_URL } from '../lib/env';

// Updated interfaces to match backend DTOs
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;
}

export interface QuestionAnswerPair {
  question: Message;
  answer?: Message;
  createdAt: Date;
}

export interface Document {
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
      role: 'user' | 'assistant';
      createdAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export interface DocumentsResponse {
  documents: Document[];
  total: number;
  searchKeyword?: string;
}

export interface ConversationMessagesResponse {
  conversationId: string;
  title: string;
  documentId?: string;
  document?: {
    id: string;
    originalName: string;
    title?: string;
  };
  messageCount: number;
  systemMessages: Message[];
  questionAnswerPairs: QuestionAnswerPair[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryResponse {
  conversationId: string;
  documentId?: string;
  question: string;
  answer: string;
  timestamp: Date;
}

export interface UploadResponse {
  status: string;
  filename: string;
  vectorId: string;
  documentId: string;
  conversationId: string;
  structure: {
    title: string;
    summary: string;
    keywords: string[];
    sections: Array<{ heading: string; content: string }>;
  };
}

export interface DocumentSearchParams {
  keyword?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'originalName';
  sortOrder?: 'ASC' | 'DESC';
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  /**
   * Upload a new document for processing
   */
  async uploadDocument(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    return response.json();
  }

  /**
   * Get all documents with optional search and sorting
   */
  async getAllDocuments(searchParams?: DocumentSearchParams): Promise<DocumentsResponse> {
    const queryParams = new URLSearchParams();
    
    if (searchParams?.keyword) {
      queryParams.append('keyword', searchParams.keyword);
    }
    if (searchParams?.sortBy) {
      queryParams.append('sortBy', searchParams.sortBy);
    }
    if (searchParams?.sortOrder) {
      queryParams.append('sortOrder', searchParams.sortOrder);
    }

    const url = `${this.baseUrl}/documents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    return response.json();
  }

  /**
   * Search documents by keyword
   */
  async searchDocuments(keyword: string, sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'originalName', sortOrder?: 'ASC' | 'DESC'): Promise<DocumentsResponse> {
    return this.getAllDocuments({ keyword, sortBy, sortOrder });
  }

  /**
   * Query a document with AI
   */
  async queryDocument(question: string, conversationId?: string, documentId?: string): Promise<QueryResponse> {
    const response = await fetch(`${this.baseUrl}/documents/query`, {
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
      throw new Error('Failed to query document');
    }

    return response.json();
  }

  /**
   * Get all messages in a conversation grouped by Q&A pairs
   */
  async getConversationMessages(conversationId: string): Promise<ConversationMessagesResponse> {
    const response = await fetch(`${this.baseUrl}/documents/conversations/${conversationId}/messages`);

    if (!response.ok) {
      throw new Error('Failed to fetch conversation messages');
    }

    return response.json();
  }

  /**
   * Get a specific document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    const documents = await this.getAllDocuments();
    return documents.documents.find(doc => doc.id === documentId) || null;
  }

  /**
   * Get documents with conversations
   */
  async getDocumentsWithConversations(): Promise<Document[]> {
    const response = await this.getAllDocuments();
    return response.documents.filter(doc => doc.conversation);
  }

  /**
   * Helper method to get recent documents
   */
  async getRecentDocuments(limit: number = 10): Promise<Document[]> {
    const response = await this.getAllDocuments({ 
      sortBy: 'createdAt', 
      sortOrder: 'DESC' 
    });
    return response.documents.slice(0, limit);
  }

  /**
   * Helper method to get documents by keyword with pagination-like limit
   */
  async searchDocumentsWithLimit(keyword: string, limit: number = 10): Promise<DocumentsResponse> {
    const response = await this.searchDocuments(keyword);
    return {
      ...response,
      documents: response.documents.slice(0, limit),
    };
  }

  // Legacy methods for backward compatibility (deprecated)
  
  /**
   * @deprecated Use queryDocument instead
   */
  async askQuestion(question: string, conversationId?: string, documentId?: string): Promise<QueryResponse> {
    console.warn('askQuestion is deprecated, use queryDocument instead');
    return this.queryDocument(question, conversationId, documentId);
  }

  /**
   * @deprecated Use queryDocument instead
   */
  async searchQuery(question: string, conversationId?: string, documentId?: string): Promise<QueryResponse> {
    console.warn('searchQuery is deprecated, use queryDocument instead');
    return this.queryDocument(question, conversationId, documentId);
  }

  /**
   * @deprecated Use getAllDocuments instead
   */
  async getAllConversations(): Promise<any[]> {
    console.warn('getAllConversations is deprecated, use getAllDocuments to get documents with conversations');
    const response = await this.getAllDocuments();
    return response.documents
      .filter(doc => doc.conversation)
      .map(doc => ({
        id: doc.conversation!.id,
        title: doc.conversation!.title,
        documentId: doc.id,
        documentTitle: doc.title,
        messageCount: doc.conversation!.messageCount,
        lastMessage: doc.conversation!.lastMessage?.content,
        lastActivity: new Date(doc.conversation!.updatedAt),
        createdAt: new Date(doc.conversation!.createdAt),
      }));
  }

  /**
   * @deprecated Use getConversationMessages instead
   */
  async createConversation(title: string, documentId?: string): Promise<any> {
    console.warn('createConversation is deprecated, conversations are automatically created when uploading documents');
    throw new Error('Manual conversation creation is no longer supported. Upload a document to create a conversation.');
  }
}

export const apiService = new ApiService();
export default apiService; 