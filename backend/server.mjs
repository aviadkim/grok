import { OpenAI } from 'openai';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure PORT is a valid number
const PORT = parseInt(process.env.PORT, 10) || 10000;
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('Invalid PORT value:', process.env.PORT);
  console.log('Falling back to default port 10000');
}

// Add debug logging
console.log('Starting server with configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: PORT,
  HOST: '0.0.0.0',
  IS_VALID_PORT: !isNaN(PORT) && PORT > 0 && PORT < 65536
});

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful customer service representative for Movna Global. Respond in Hebrew and be polite and professional, focusing on structured financial products for qualified and unqualified clients.' 
        },
        { role: 'user', content: userMessage }
      ],
    });
    const botMessage = completion.choices[0].message.content;
    res.json({ message: botMessage });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Bind to 0.0.0.0 to accept connections on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
