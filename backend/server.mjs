import { OpenAI } from 'openai';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import portfinder from 'portfinder';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set base port for Render
portfinder.basePort = process.env.PORT || 3000;

portfinder.getPort((err, port) => {
  if (err) {
    console.error('Error finding port:', err);
    process.exit(1);
  }

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

  app.use(express.static('public'));

  app.listen(port, () => console.log(`Server running on port ${port}`));
});
