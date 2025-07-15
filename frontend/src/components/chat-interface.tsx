"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Plus, Settings, User, Bot, Upload } from "lucide-react"
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
import { ChatMessage, type Message } from "@/components/ui/chat-message"
import { MessageInput } from "@/components/ui/message-input"
import { apiService, type Conversation, type QuestionResponse } from "@/services/api"

function ChatSidebar({ 
  conversations, 
  activeConversationId, 
  setActiveConversationId, 
  onNewChat, 
  onUploadDocument, 
  isLoading 
}: {
  conversations: Conversation[]
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  onNewChat: () => void
  onUploadDocument: (file: File) => void
  isLoading: boolean
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUploadDocument(file)
    }
  }

  return (
    <Sidebar className="bg-gray-900 border-gray-700">
      <SidebarHeader className="p-4 border-b border-gray-700 bg-gray-900">
        <Button
          onClick={onNewChat}
          disabled={isLoading}
          className="w-full mb-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 items-center justify-center gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>

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
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <SidebarInput
            placeholder="Search chats"
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
              <div className="p-4 text-gray-400 text-center">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-gray-400 text-center">
                {searchTerm ? 'No conversations found' : 'No conversations yet'}
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveConversationId(conversation.id)}
                    isActive={activeConversationId === conversation.id}
                    className="w-full justify-start text-left text-gray-300 hover:bg-gray-800 hover:text-white data-[active=true]:bg-gray-700 data-[active=true]:text-white rounded-md p-2 transition-colors"
                  >
                    <div className="flex flex-col items-start w-full">
                      <span className="truncate text-sm font-medium">{conversation.title}</span>
                      {conversation.lastMessage && (
                        <span className="truncate text-xs text-gray-500 mt-1">
                          {conversation.lastMessage}
                        </span>
                      )}
                      {conversation.documentTitle && (
                        <span className="truncate text-xs text-blue-400 mt-1">
                          📄 {conversation.documentTitle}
                        </span>
                      )}
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
  activeConversationId, 
  conversations, 
  onNewChat 
}: {
  activeConversationId: string | null
  conversations: Conversation[]
  onNewChat: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [files, setFiles] = useState<File[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const activeConversation = conversations.find(c => c.id === activeConversationId)

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
      const messages = await apiService.getConversationMessages(conversationId)
      setMessages(messages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && (!files || files.length === 0)) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
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
    setIsGenerating(true)

    try {
      let conversationTitle = input.slice(0, 50) + (input.length > 50 ? '...' : '')
      
      const response: QuestionResponse = await apiService.askQuestion(
        input,
        activeConversationId || undefined,
        activeConversation?.documentId,
        !activeConversationId ? conversationTitle : undefined
      )

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
        createdAt: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // If this was a new conversation, reload conversations to get the new one
      if (!activeConversationId) {
        // The parent component should handle reloading conversations
        // and setting the active conversation to the new one
        window.location.reload() // Temporary solution
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      
      const errorMessage: Message = {
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

  const stopGeneration = () => {
    setIsGenerating(false)
  }

  return (
    <SidebarInset className="bg-black">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-800 bg-black">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-md transition-colors" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewChat}
              className="text-gray-400 hover:text-white hover:bg-gray-800 sm:hidden flex items-center gap-2 px-3 py-2"
            >
              <Plus className="h-4 w-4" />
              New chat
            </Button>
            {activeConversation && (
              <div className="hidden sm:block text-gray-300 text-sm">
                {activeConversation.title}
                {activeConversation.documentTitle && (
                  <span className="text-blue-400 ml-2">📄 {activeConversation.documentTitle}</span>
                )}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-md transition-colors"
          >
            <Settings className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 bg-black">
          <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-400">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="text-gray-400 text-lg">
                  {activeConversationId ? 'No messages in this conversation yet.' : 'Start a new conversation'}
                </div>
                <div className="text-gray-500 text-sm">
                  {activeConversationId 
                    ? 'Send a message to get started!' 
                    : 'Ask me anything or upload a document to begin chatting!'
                  }
                </div>
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
                  
                  <div className={message.role === "user" ? "flex flex-col items-end" : "flex-1"}>
                    <ChatMessage
                      {...message}
                      showTimeStamp={true}
                      animation="slide"
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
                <div className="flex-1">
                  <div className="bg-muted text-foreground rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
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
                placeholder={activeConversation?.documentTitle 
                  ? `Ask about ${activeConversation.documentTitle}...` 
                  : "Ask anything..."}
                allowAttachments={true}
                files={files}
                setFiles={setFiles}
                isGenerating={isGenerating}
                stop={stopGeneration}
                enableInterrupt={true}
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
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const conversations = await apiService.getAllConversations()
      setConversations(conversations)
      
      // Set the first conversation as active if none is selected
      if (conversations.length > 0 && !activeConversationId) {
        setActiveConversationId(conversations[0].id)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = () => {
    setActiveConversationId(null)
  }

  const handleUploadDocument = async (file: File) => {
    try {
      setIsLoading(true)
      await apiService.uploadDocument(file)
      
      // Create a new conversation for this document
      const conversation = await apiService.createConversation(
        `Chat about ${file.name}`,
        undefined // documentId would be returned from upload
      )
      
      // Reload conversations and set the new one as active
      await loadConversations()
      setActiveConversationId(conversation.id)
    } catch (error) {
      console.error('Failed to upload document:', error)
      alert('Failed to upload document. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-black overflow-hidden">
        <ChatSidebar 
          conversations={conversations}
          activeConversationId={activeConversationId}
          setActiveConversationId={setActiveConversationId}
          onNewChat={handleNewChat}
          onUploadDocument={handleUploadDocument}
          isLoading={isLoading}
        />
        <MainContent 
          activeConversationId={activeConversationId}
          conversations={conversations}
          onNewChat={handleNewChat}
        />
      </div>
    </SidebarProvider>
  )
}
