import { OpenAI } from 'openai';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { findAvailablePort } from 'portfinder';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

findAvailablePort(4000, 5000).then(PORT => {
  console.log('Found available port:', PORT);
  app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    console.log('Received message:', userMessage);
    if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      console.log('Calling OpenAI API...');
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
      console.log('OpenAI response:', completion);
      const botMessage = completion.choices[0].message.content;
      res.json({ message: botMessage });
    } catch (error) {
      console.error('OpenAI Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'An error occurred while processing your request' });
    }
  });

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(error => console.error('Error finding port:', error));
