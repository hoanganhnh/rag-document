# Document AI App

A modern document processing and chat application built with AI capabilities. Upload documents (PDF, text, images, CSV) and chat with them using OpenAI and Pinecone vector database for intelligent document search and Q&A.

## Features

- 📄 **Document Upload**: Support for PDF, TXT, CSV, and image files
- 🤖 **AI-Powered Chat**: Chat with your documents using OpenAI GPT-4
- 🔍 **Vector Search**: Pinecone integration for semantic document search
- 💾 **Conversation History**: Persistent chat history with PostgreSQL
- 🖼️ **OCR Support**: Extract text from images using Tesseract.js
- 📱 **Modern UI**: Responsive design with Next.js and Tailwind CSS
- 🔒 **Type Safety**: Full TypeScript support

## Tech Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **AI**: OpenAI GPT-4 + LangChain
- **Vector DB**: Pinecone
- **File Processing**: PDF parsing, OCR, CSV parsing
- **File Upload**: Multer

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: React hooks
- **HTTP Client**: Fetch API

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or higher)
- **Yarn** (recommended) or npm
- **Docker & Docker Compose** (for database)

### API Keys Required

You'll need the following API keys:

1. **OpenAI API Key** - Get from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Pinecone API Key** - Get from [Pinecone Console](https://app.pinecone.io/)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd document-ai-app
```

### 2. Backend Setup

#### Navigate to Backend Directory
```bash
cd backend
```

#### Install Dependencies
```bash
yarn install
# or
npm install
```

#### Set Up Environment Variables
Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=document_ai
DATABASE_SSL=false

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=document-ai-index

# Application Configuration
NODE_ENV=development
PORT=3001
```

#### Start Database with Docker
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port `5432`
- Adminer (database admin) on port `8080`

#### Verify Database Connection
Visit [http://localhost:8080](http://localhost:8080) to access Adminer:
- **System**: PostgreSQL
- **Server**: postgres
- **Username**: postgres
- **Password**: password
- **Database**: document_ai

#### Start Backend Server
```bash
# Development mode with auto-reload
yarn start:dev

# or for production
yarn build
yarn start:prod
```

The backend API will be available at [http://localhost:3001](http://localhost:3001)

### 3. Frontend Setup

#### Navigate to Frontend Directory (new terminal)
```bash
cd frontend
```

#### Install Dependencies
```bash
yarn install
# or
npm install
```

#### Set Up Environment Variables
Create a `.env.local` file in the frontend directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional: Enable detailed logging
NEXT_PUBLIC_SHOW_LOGGER=true
```

#### Start Frontend Server
```bash
# Development mode
yarn dev

# or for production
yarn build
yarn start
```

The frontend will be available at [http://localhost:3000](http://localhost:3000)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Create a Pull Request
