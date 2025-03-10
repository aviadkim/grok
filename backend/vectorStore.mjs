import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { Document } from 'langchain/document';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VectorStoreManager {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    this.vectorStore = null;
  }

  async initialize() {
    try {
      // Load Q&A data using correct path resolution
      const qaDataPath = path.join(__dirname, '..', 'knowledge', 'qa_data.json');
      const qaData = JSON.parse(
        await fs.readFile(qaDataPath, 'utf-8')
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

    // Clean and prepare the query
    const searchQuery = query
      .replace(/[?!.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Get more results initially and filter them
    const results = await this.vectorStore.similaritySearch(searchQuery, k * 2);
    
    // Filter and sort by relevance
    const filteredResults = results
      .filter(doc => doc.pageContent.length < 500) // Avoid too long responses
      .slice(0, k); // Take only the top k results

    return filteredResults.map(doc => {
      const [question, answer] = doc.pageContent.split('\nA: ');
      return answer ? answer.trim() : '';
    });
  }
}
