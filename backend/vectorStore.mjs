import { OpenAIEmbeddings } from 'openai';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { Document } from 'langchain/document';
import fs from 'fs/promises';

export class VectorStoreManager {
  constructor() {
    this.embeddings = new OpenAIEmbeddings();
    this.vectorStore = null;
  }

  async initialize() {
    try {
      // Load Q&A data
      const qaData = JSON.parse(
        await fs.readFile('../knowledge/qa_data.json', 'utf-8')
      );

      // Convert Q&A pairs to documents
      const documents = qaData.qa_pairs.map(qa => 
        new Document({
          pageContent: `Q: ${qa.question}\nA: ${qa.answer}`,
          metadata: { source: 'qa_database' }
        })
      );

      // Create vector store
      this.vectorStore = await FaissStore.fromDocuments(
        documents,
        this.embeddings
      );

      console.log('Vector store initialized with', documents.length, 'documents');
    } catch (error) {
      console.error('Error initializing vector store:', error);
      throw error;
    }
  }

  async findRelevantContent(query, k = 3) {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    const results = await this.vectorStore.similaritySearch(query, k);
    return results.map(doc => doc.pageContent);
  }
}
