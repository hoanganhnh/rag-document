

# Backend

## API Endpoints

### Documents API

#### 1. Get All Documents with Search
**GET** `/documents`

Retrieve all documents with their associated conversations and optional keyword search.

**Query Parameters:**
- `keyword` (optional): Search term to filter documents by name, title, summary, content, or keywords
- `sortBy` (optional): Sort field - `createdAt`, `updatedAt`, `title`, or `originalName` (default: `createdAt`)
- `sortOrder` (optional): Sort direction - `ASC` or `DESC` (default: `DESC`)

**Example Requests:**
```bash
# Get all documents
GET /documents

# Search documents by keyword
GET /documents?keyword=contract

# Search and sort by title ascending
GET /documents?keyword=legal&sortBy=title&sortOrder=ASC

# Sort by creation date descending
GET /documents?sortBy=createdAt&sortOrder=DESC
```

**Response Format:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "filename": "document-123456789.pdf",
      "originalName": "contract.pdf",
      "mimeType": "application/pdf",
      "title": "Service Agreement",
      "summary": "Legal contract for services...",
      "keywords": ["legal", "contract", "services"],
      "extractedText": "This agreement outlines...",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "conversation": {
        "id": "uuid",
        "title": "Q&A for contract.pdf",
        "messageCount": 5,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T01:00:00Z"
      }
    }
  ],
  "total": 1,
  "searchKeyword": "contract"
}
```

#### 2. Upload Document
**POST** `/documents/upload`

Upload a new document for processing and analysis.

#### 3. Query Document
**POST** `/documents/query`

Ask questions about documents using conversational AI.

#### 4. Get Conversation Messages
**GET** `/documents/conversations/:conversationId/messages`

Retrieve all messages in a conversation grouped by question-answer pairs.

**Path Parameters:**
- `conversationId`: UUID of the conversation

**Response Format:**
```json
{
  "conversationId": "uuid",
  "title": "Q&A for document.pdf",
  "documentId": "uuid",
  "document": {
    "id": "uuid",
    "originalName": "document.pdf",
    "title": "Document Title"
  },
  "messageCount": 5,
  "systemMessages": [
    {
      "id": "uuid",
      "role": "system",
      "content": "Document uploaded...",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "parentId": null
    }
  ],
  "questionAnswerPairs": [
    {
      "question": {
        "id": "uuid",
        "role": "user",
        "content": "What is this document about?",
        "createdAt": "2024-01-01T00:01:00Z",
        "updatedAt": "2024-01-01T00:01:00Z",
        "parentId": null
      },
      "answer": {
        "id": "uuid",
        "role": "assistant",
        "content": "This document is about...",
        "createdAt": "2024-01-01T00:01:05Z",
        "updatedAt": "2024-01-01T00:01:05Z",
        "parentId": "question-uuid"
      },
      "createdAt": "2024-01-01T00:01:00Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:01:05Z"
}
```

## Search Functionality

The search functionality allows filtering documents by:

1. **Original filename** - Case-insensitive partial match
2. **Document title** - Case-insensitive partial match  
3. **Summary** - Case-insensitive partial match
4. **Extracted text content** - Case-insensitive partial match
5. **Keywords** - Case-insensitive partial match against any keyword

### Search Examples:

- Search for legal documents: `?keyword=legal`
- Search for contracts: `?keyword=contract` 
- Search for specific company: `?keyword=acme%20corp`
- Combined search and sort: `?keyword=invoice&sortBy=createdAt&sortOrder=DESC`

## Response Features

- **Truncated content**: Long text fields are truncated with "..." for better API performance
- **Message counts**: Each conversation includes total message count
- **Last message preview**: Shows the most recent non-system message (up to 100 characters)
- **Comprehensive metadata**: Includes all document metadata (title, summary, keywords, etc.)
- **Conversation linking**: Documents are linked to their associated conversations when available
