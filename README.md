# Grok Deployment Guide

## Local Development

1. Install dependencies:
```
cd /workspaces/grok
npm install
cd backend
npm install @langchain/community --legacy-peer-deps
```

2. Start the server:
```
cd backend
node server.mjs
```

## Deployment on Render

### Setup

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node server.mjs`

### Environment Variables

Add the following environment variables in the Render dashboard:

- `OPENAI_API_KEY`: Your OpenAI API key
- `RENDER`: `true`
- `NODE_ENV`: `production`

### File Structure

Ensure your project structure is:

```
grok/
├── backend/
│   ├── public/          # Static files served by Express
│   │   └── index.html   # Your frontend app's entry point
│   ├── node_modules/
│   ├── knowledge/       # RAG knowledge base
│   │   └── qa_data.json # Q&A pairs for the vector store
│   ├── server.mjs       # Main server file
│   └── vectorStore.mjs  # Vector store manager
├── render.yaml          # Render configuration
└── README.md            # This file
```

### Troubleshooting

If you encounter path issues:
1. Check that the public directory exists in the backend folder
2. Make sure index.html exists in the public directory
3. Verify that all environment variables are set correctly