"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Settings, User, Bot, Upload, FileText, Calendar, Zap, ZapOff } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInput,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "@/components/ui/chat-message"
import { MessageInput } from "@/components/ui/message-input"
import { apiService, type Document, type ConversationMessagesResponse, type QueryResponse } from "@/services/api"
import { TypingIndicator } from "@/components/ui/typing-indicator"
import { useStreamingQuery } from "@/hooks/use-streaming-query"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  experimental_attachments?: Array<{
    name: string;
    contentType: string;
    url: string;
  }>;
}

function DocumentSidebar({ 
  documents, 
  activeConversationId, 
  onDocumentClick,
  onUploadDocument, 
  isLoading 
}: {
  documents: Document[]
  activeConversationId: string | null
  onDocumentClick: (document: Document) => void
  onUploadDocument: (file: File) => void
  isLoading: boolean
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredDocuments = documents.filter(doc =>
    doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadDocument(file)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <Sidebar className="bg-gray-900 border-gray-700">
      <SidebarHeader className="p-4 border-b border-gray-700 bg-gray-900">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 items-center justify-center gap-2"
          variant="outline"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <SidebarInput
            placeholder="Search documents"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-gray-500"
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-gray-900">
        <ScrollArea className="flex-1">
          <SidebarMenu className="p-2">
            {isLoading ? (
              <div className="p-4 text-gray-400 text-center">Loading documents...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-4 text-gray-400 text-center">
                {searchTerm ? 'No documents found' : 'No documents yet. Upload one to get started!'}
              </div>
            ) : (
              filteredDocuments.map((document) => (
                <SidebarMenuItem key={document.id}>
                  <SidebarMenuButton
                    onClick={() => onDocumentClick(document)}
                    isActive={activeConversationId === document.conversation?.id}
                    size="lg"
                    className="w-full justify-start text-left text-gray-300 hover:bg-gray-800 hover:text-white data-[active=true]:bg-gray-700 data-[active=true]:text-white rounded-md transition-colors min-h-[auto] h-auto p-3"
                  >
                    <div className="flex items-start gap-2 w-full min-w-0">
                      <FileText className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      
                      <div className="flex flex-col min-w-0 flex-1 space-y-1">
                        {/* Document title */}
                        <div className="font-medium text-sm truncate">
                          {document.title || document.originalName}
                        </div>
                        
                          {/* Summary */}
                         {document.summary && (
                           <div className="text-xs text-gray-500 leading-tight overflow-hidden max-h-8">
                             {document.summary.slice(0, 80)}
                             {document.summary.length > 80 && "..."}
                           </div>
                         )}
                        
                        {/* Date and message count */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="truncate">
                              {formatDate(new Date(document.createdAt))}
                            </span>
                          </div>
                          
                          {document.conversation && (
                            <span className="text-green-400 whitespace-nowrap ml-2">
                              {document.conversation.messageCount} msgs
                            </span>
                          )}
                        </div>
                        
                        {/* Keywords */}
                        {document.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {document.keywords.slice(0, 2).map((keyword, index) => (
                              <span 
                                key={index}
                                className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded truncate max-w-[80px]"
                              >
                                {keyword}
                              </span>
                            ))}
                            {document.keywords.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{document.keywords.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  )
}

function MainContent({ 
  activeDocument,
  activeConversationId, 
}: {
  activeDocument: Document | null
  activeConversationId: string | null
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState("")
  const [files, setFiles] = useState<File[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [streamingEnabled, setStreamingEnabled] = useState(true)
  const router = useRouter()
  const { streamingResponse, isStreaming, error: streamingError, startStreaming, resetStream } = useStreamingQuery()

  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId)
    } else {
      setMessages([])
    }
  }, [activeConversationId])

  const loadConversationMessages = async (conversationId: string) => {
    setIsLoadingMessages(true)
    try {
      const response: ConversationMessagesResponse = await apiService.getConversationMessages(conversationId)
      
      const displayMessages: DisplayMessage[] = []
      
      response.systemMessages.forEach(msg => {
        displayMessages.push({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.createdAt),
        })
      })
      
      response.questionAnswerPairs.forEach(pair => {
        displayMessages.push({
          id: pair.question.id,
          role: pair.question.role,
          content: pair.question.content,
          createdAt: new Date(pair.question.createdAt),
        })
        
        if (pair.answer) {
          displayMessages.push({
            id: pair.answer.id,
            role: pair.answer.role,
            content: pair.answer.content,
            createdAt: new Date(pair.answer.createdAt),
          })
        }
      })
      
      displayMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      setMessages(displayMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && (!files || files.length === 0)) return
    if (!activeDocument) {
      alert('Please select a document first')
      return
    }

    const questionText = input
    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: questionText,
      createdAt: new Date(),
      experimental_attachments: files?.map(file => ({
        name: file.name,
        contentType: file.type,
        url: URL.createObjectURL(file)
      }))
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setFiles(null)

    if (streamingEnabled) {
      // Add a placeholder message for streaming
      const streamingMessageId = (Date.now() + 1).toString()
      const streamingMessage: DisplayMessage = {
        id: streamingMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      }
      setMessages(prev => [...prev, streamingMessage])

      try {
        resetStream()
        await startStreaming(
          questionText,
          activeConversationId || undefined,
          activeDocument.id
        )

        // The useEffect will handle updating the message content
        // No need to manually update here as it creates race conditions

        // Handle conversation creation for new documents
        if (!activeConversationId) {
          // Reload documents to get the new conversation
          window.dispatchEvent(new CustomEvent('conversationCreated', { 
            detail: { documentId: activeDocument.id } 
          }))
        }
      } catch (error) {
        console.error('Failed to stream message:', error)
        
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, content: "Sorry, I encountered an error while processing your message. Please try again." }
            : msg
        ))
      }
    } else {
      // Use regular non-streaming query
      setIsGenerating(true)

      try {
        const response: QueryResponse = await apiService.queryDocument(
          questionText,
          activeConversationId || undefined,
          activeDocument.id
        )

        const assistantMessage: DisplayMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.answer,
          createdAt: new Date(response.timestamp),
        }

        setMessages(prev => [...prev, assistantMessage])

        if (!activeConversationId && response.conversationId) {
          router.push(`?conversationId=${response.conversationId}`, { scroll: true })
          
          window.dispatchEvent(new CustomEvent('conversationCreated', { 
            detail: { conversationId: response.conversationId } 
          }))
        }
      } catch (error) {
        console.error('Failed to send message:', error)
        
        const errorMessage: DisplayMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error while processing your message. Please try again.",
          createdAt: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      } finally {
        setIsGenerating(false)
      }
    }
  }

  const stopGeneration = () => {
    setIsGenerating(false)
    // Note: Streaming cannot be stopped once started with current implementation
  }

  // Update streaming message in real-time AND preserve final content
  useEffect(() => {
    if (streamingResponse) {
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          return prev.map((msg, index) => 
            index === prev.length - 1 
              ? { ...msg, content: streamingResponse }
              : msg
          )
        }
        return prev
      })
    }
  }, [streamingResponse]) // Remove isStreaming dependency

  return (
    <SidebarInset className="bg-black">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-800 bg-black">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-md transition-colors" />
            {activeDocument && (
              <div className="hidden sm:block text-gray-300 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span>{activeDocument.title || activeDocument.originalName}</span>
                </div>
                {activeDocument.conversation && (
                  <span className="text-xs text-gray-500">
                    {activeDocument.conversation.messageCount} messages
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStreamingEnabled(!streamingEnabled)}
                    className={`p-2 rounded-md transition-colors ${
                      streamingEnabled 
                        ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {streamingEnabled ? (
                      <Zap className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <ZapOff className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{streamingEnabled ? 'Streaming Enabled' : 'Streaming Disabled'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-md transition-colors"
            >
              <Settings className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 bg-black">
          <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
            {!activeDocument ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <FileText className="h-16 w-16 text-gray-600" />
                <div className="text-gray-400 text-lg">No document selected</div>
                <div className="text-gray-500 text-sm">
                  Upload a document or select one from the sidebar to start chatting
                </div>
              </div>
            ) : isLoadingMessages ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-400">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="text-gray-400 text-lg">
                  Ready to chat about {activeDocument.title || activeDocument.originalName}
                </div>
                <div className="text-gray-500 text-sm max-w-md">
                  {activeDocument.summary && (
                    <p className="mb-2">{activeDocument.summary}</p>
                  )}
                  Ask questions about this document to get started!
                </div>
                {activeDocument.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="text-xs text-gray-500">Topics:</span>
                    {activeDocument.keywords.map((keyword, index) => (
                      <span 
                        key={index}
                        className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                  
                  {message.role === "system" && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <Settings className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                  
                  <div className={message.role === "user" ? "flex flex-col items-end" : "flex-1"}>
                    <ChatMessage
                      {...message}
                      showTimeStamp={true}
                      animation="fade"
                    />
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isGenerating && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-gray-300" />
                </div>
                <div className="flex items-center gap-2">
                  <TypingIndicator />
                  {isStreaming && (
                    <span className="text-xs text-blue-400">Streaming...</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-gray-800 p-3 md:p-4 bg-black">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit}>
              <MessageInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeDocument 
                  ? `Ask about ${activeDocument.title || activeDocument.originalName}...` 
                  : "Select a document to start chatting..."}
                allowAttachments={false}
                isGenerating={isStreaming || isGenerating}
                stop={stopGeneration}
                enableInterrupt={true}
                disabled={!activeDocument}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:ring-gray-500 focus:border-gray-500"
              />
            </form>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}

export default function ChatInterface() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDocument, setActiveDocument] = useState<Document | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDocuments()
    
    const handleConversationCreated = (event: CustomEvent) => {
      setActiveConversationId(event.detail.conversationId)
      loadDocuments()
    }
    
    window.addEventListener('conversationCreated', handleConversationCreated as EventListener)
    return () => {
      window.removeEventListener('conversationCreated', handleConversationCreated as EventListener)
    }
  }, [])

  useEffect(() => {
    const conversationId = searchParams.get('conversationId')
    if (conversationId && conversationId !== activeConversationId) {
      setActiveConversationId(conversationId)
      
      const document = documents.find(doc => doc.conversation?.id === conversationId)
      if (document) {
        setActiveDocument(document)
      }
    }
  }, [searchParams, documents, activeConversationId])

  const loadDocuments = async () => {
    try {
      const response = await apiService.getAllDocuments({ 
        sortBy: 'createdAt', 
        sortOrder: 'DESC' 
      })
      setDocuments(response.documents)
      
      const conversationId = searchParams.get('conversationId')
      if (conversationId) {
        const document = response.documents.find(doc => doc.conversation?.id === conversationId)
        if (document) {
          setActiveDocument(document)
          setActiveConversationId(conversationId)
        }
      } else if (!activeDocument && response.documents.length > 0) {
        const firstDocWithConversation = response.documents.find(doc => doc.conversation)
        if (firstDocWithConversation) {
          setActiveDocument(firstDocWithConversation)
          setActiveConversationId(firstDocWithConversation.conversation!.id)
        }
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentClick = (document: Document) => {
    setActiveDocument(document)
    
    if (document.conversation) {
      setActiveConversationId(document.conversation.id)
      
      router.push(`?conversationId=${document.conversation.id}`, { scroll: false })
    } else {
      setActiveConversationId(null)
      
      router.push('/', { scroll: false })
    }
  }


  const handleUploadDocument = async (file: File) => {
    try {
      setIsLoading(true)
      const response = await apiService.uploadDocument(file)
      
      await loadDocuments()
      
      const newDocument = documents.find(doc => doc.id === response.documentId)
      if (newDocument) {
        setActiveDocument(newDocument)
        
        if (response.conversationId) {
          setActiveConversationId(response.conversationId)
          router.push(`?conversationId=${response.conversationId}`, { scroll: false })
        }
      }
      
      alert(`Document "${file.name}" uploaded successfully!`)
    } catch (error) {
      console.error('Failed to upload document:', error)
      alert('Failed to upload document. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden">
        <DocumentSidebar 
          documents={documents}
          activeConversationId={activeConversationId}
          onDocumentClick={handleDocumentClick}
          onUploadDocument={handleUploadDocument}
          isLoading={isLoading}
        />
        <MainContent 
          activeDocument={activeDocument}
          activeConversationId={activeConversationId}
        />
      </div>
    </SidebarProvider>
  )
}
