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
    // Retrieve more relevant content
    const relevantContent = await vectorStore.findRelevantContent(userMessage, 5); // increased from 3 to 5
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `אתה נציג שירות מקצועי ומנוסה בחברת מובנה גלובל, המתמחה במוצרים פיננסיים מובנים.

הנחיות חשובות:
1. השתמש במידע הבא לתשובתך:
${relevantContent.join('\n')}

2. כללי מפתח:
- ענה תמיד בצורה מפורטת ומעמיקה
- הסבר מושגים מורכבים בצורה פשוטה וברורה
- תן דוגמאות מעשיות כשרלוונטי
- הצע תמיד המשך שיחה או מידע נוסף
- שמור על טון מקצועי אך ידידותי

3. בכל תשובה:
- התחל עם הסבר כללי
- פרט את הנקודות העיקריות
- הוסף דוגמה או המחשה
- סיים עם הצעה להמשך התקשרות או מידע נוסף

4. חובה לכלול:
- אזהרות רגולטוריות כשנדרש
- הפניה לייעוץ אישי בנושאים רגישים
- דגש על חשיבות התאמה אישית

שפת תשובה: ${isHebrewMessage ? 'עברית' : 'English'}`
        },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 800, // increased for more detailed responses
      presence_penalty: 0.6, // encourage more varied responses
      frequency_penalty: 0.3 // discourage repetition
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
