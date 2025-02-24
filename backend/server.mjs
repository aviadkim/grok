import { OpenAI } from 'openai';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { VectorStoreManager } from './vectorStore.mjs';

dotenv.config();

const app = express();

// Configure CORS for all origins in development
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://your-render-domain.onrender.com' : '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure port is a number
const PORT = parseInt(process.env.PORT || '10000', 10);

// Add language detection function
function isHebrew(text) {
  return /[\u0590-\u05FF]/.test(text);
}

const vectorStore = new VectorStoreManager();
await vectorStore.initialize();

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const isHebrewMessage = isHebrew(userMessage);
  
  try {
    // Retrieve relevant content
    const relevantContent = await vectorStore.findRelevantContent(userMessage);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `You are an expert financial advisor at Movna Global, specializing in structured financial products.
          Instructions:
          - Respond in ${isHebrewMessage ? 'Hebrew' : 'English'}
          - Use the following relevant information to inform your response:
          ${relevantContent.join('\n')}
          - Be concise but informative
          - Explain complex terms simply
          - Use professional financial terminology in ${isHebrewMessage ? 'Hebrew' : 'English'}
          - If asked about specific products, always mention the importance of personal consultation
          - Include relevant regulatory disclaimers when appropriate
          - If user writes in Hebrew, respond in Hebrew. If user writes in English, respond in English`
        },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const botMessage = completion.choices[0].message.content;
    res.json({ message: botMessage });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: isHebrewMessage 
        ? 'אירעה שגיאה בעיבוד הבקשה שלך' 
        : 'An error occurred while processing your request'
    });
  }
});

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bind to 0.0.0.0 to accept all incoming connections
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});
