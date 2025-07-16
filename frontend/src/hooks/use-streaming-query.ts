import { useState, useCallback } from 'react';
import { apiService } from '@/services/api';

interface UseStreamingQueryReturn {
  streamingResponse: string;
  isStreaming: boolean;
  error: string | null;
  startStreaming: (question: string, conversationId?: string, documentId?: string) => Promise<void>;
  resetStream: () => void;
}

export function useStreamingQuery(): UseStreamingQueryReturn {
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const startStreaming = useCallback(async (
    question: string, 
    conversationId?: string, 
    documentId?: string
  ) => {
    setIsStreaming(true);
    setError(null);
    setStreamingResponse('');

    try {
      const stream = apiService.queryDocumentStream(question, conversationId, documentId);

      for await (const chunk of stream) {
        setStreamingResponse(prev => prev + chunk);
      }
      // Don't clear streamingResponse when streaming completes
      // Let it persist so the final message is preserved
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during streaming');
    } finally {
      setIsStreaming(false);
      // Note: streamingResponse is preserved here
    }
  }, []);

  const resetStream = useCallback(() => {
    setStreamingResponse('');
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    streamingResponse,
    isStreaming,
    error,
    startStreaming,
    resetStream,
  };
} 