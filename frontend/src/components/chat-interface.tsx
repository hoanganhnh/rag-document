"use client"

import { useState } from "react"
import { Search, Plus, Settings, User, Bot } from "lucide-react"
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

const chatHistory = [
  "Callback URL mismatch fix",
  "Pinecone Environment and in...",
  "Full Column Rank Matrix",
  "FiD for Text Modality",
  "TypeScript Component Ref Fix",
  "Scatter marker size s",
  "Design Matrix Explanation",
  "Placeholder Image Creation",
  "Placeholder blur setup",
  "Add Adminer to Docker",
  "Disable Unused Vars Rule",
  "Dialog Popover Issue Fix",
  "Bfloat16 NaN Avoidance",
  "Default dilation in Conv2d",
  "itertools combinations example",
  "Slate React Syntax Highlighting",
  "Bash loop for Python",
  "Slide Show Animation Fix",
  "Push repo to GitHub",
  "LaTeX sign function",
  "Convert tensor dtype to float64",
]

const initialMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "I'm getting a callback URL mismatch error in Auth0. Can you help me fix this?",
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: "2",
    role: "assistant",
    content: `The error **"Callback URL mismatch"** in Auth0 means the URL your application is using as \`redirect_uri\` **is not registered** in your Auth0 Application Settings.

## ✅ How to fix it:

### Step 1: Find the \`redirect_uri\` used in your app

In your frontend code (e.g., in Auth0's login method), you might see something like:

\`\`\`javascript
auth0Client.loginWithRedirect({
  redirect_uri: 'http://localhost:3000/callback'
});
\`\`\`

Take note of that URL.

### Step 2: Add it to Auth0 Application Settings

1. Go to [Auth0 Dashboard](https://manage.auth0.com).
2. Navigate to **Applications > Applications**.
3. Click on your app name.
4. Scroll down to **Application URIs** section.
5. Add your callback URL to the **Allowed Callback URLs** field.
6. Click **Save Changes**.

That should resolve the callback URL mismatch error!`,
    createdAt: new Date(Date.now() - 4 * 60 * 1000),
  },
]

function ChatSidebar() {
  const [activeChat, setActiveChat] = useState("Callback URL mismatch fix")

  return (
    <Sidebar className="bg-gray-900 border-gray-700">
      <SidebarHeader className="p-4 border-b border-gray-700 bg-gray-900">
        <Button
          className="w-full mb-4 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 items-center justify-center gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <SidebarInput
            placeholder="Search chats"
            className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-gray-500"
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-gray-900">
        <ScrollArea className="flex-1">
          <SidebarMenu className="p-2">
            {chatHistory.map((chat, index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuButton
                  onClick={() => setActiveChat(chat)}
                  isActive={activeChat === chat}
                  className="w-full justify-start text-left text-gray-300 hover:bg-gray-800 hover:text-white data-[active=true]:bg-gray-700 data-[active=true]:text-white rounded-md p-2 transition-colors"
                >
                  <span className="truncate text-sm">{chat}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  )
}

function MainContent() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [files, setFiles] = useState<File[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

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

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I understand your question. Let me help you with that...",
        createdAt: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsGenerating(false)
    }, 1000)
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
              className="text-gray-400 hover:text-white hover:bg-gray-800 sm:hidden flex items-center gap-2 px-3 py-2"
            >
              <Plus className="h-4 w-4" />
              New chat
            </Button>
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
            {messages.map((message) => (
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
            ))}
            
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
                placeholder="Ask anything..."
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
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-black overflow-hidden">
        <ChatSidebar />
        <MainContent />
      </div>
    </SidebarProvider>
  )
}
