# Chat with your PDF

This app is a simple server that allows to vectorize a PDF document and store embeddings in a MongoDB database. It also allows to perform semantic search on the stored embeddings in a chat endpoint and retrieve relevant documents based on the user's query, only answering when it knows the answer.

## Prerequisites
- Node.js (v18 or higher)
- MongoDB from Mongo Atlas with an atlas vector index

## Installation
```bash
npm install
```

## Usage
```bash
npm run dev
```

## Environment Variables
Provide the following vars when starting the server:
- `PORT`: Port to run the server on (default: 5000)
- `MONGO_DB_URI`: MongoDB connection string (default: `mongodb://localhost:27017/rag_local`)
- `GEMINI_API_KEY`: Gemini API key for AI provider
- `AI_PROVIDER`: AI provider to use (default: `gemini`)
- `MESSAGE_WINDOW_SIZE`: Number of messages to keep in the chat window (default: 5)
- `MODE`: Mode of operation (default: `normal`)


## Endpoints
- `POST /vectorize`: Vectorizes a PDF document and stores embeddings in the database.
- `POST /chat`: Performs semantic search on the stored embeddings and returns relevant documents based on the user's query.
- `POST /semantic-search`: Performs semantic search on the stored embeddings and returns