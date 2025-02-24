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
    // Get relevant content with improved filtering
    const relevantContent = await vectorStore.findRelevantContent(userMessage, 3); // reduced back to 3 for more focused answers
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `אתה נציג שירות בכיר של מובנה גלובל - חברה מובילה בתחום המוצרים הפיננסיים המובנים.

מידע בסיסי על החברה:
- מובנה גלובל היא חברה המתמחה במוצרים פיננסיים מובנים
- החברה עובדת מול בנקים בינלאומיים בדירוג השקעה גבוה
- מינימום השקעה: 100,000 ₪
- מוצרי החברה משלבים אג"ח, מניות ונגזרים
- יתרונות: סחירות יומית, הגנות קרן, תשואות אטרקטיביות

דגשים לתשובות:
1. היה מקצועי אך חם ואישי
2. תן דוגמאות מוחשיות למוצרים ספציפיים
3. הסבר בצורה פשוטה ומובנת
4. הדגש את היתרונות הייחודיים של מובנה גלובל
5. הפנה תמיד לייעוץ אישי לפרטים נוספים

דוגמאות למוצרים:
- פיקדון מובנה עם הגנת קרן מלאה
- הייטק מובנה עם חשיפה למניות טכנולוגיה
- תעודות פיקדון בינלאומיות
- מוצרים מובנים עם חשיפה למדדים מובילים

מידע נוסף מהמאגר:
${relevantContent.join('\n')}

שפת מענה: עברית בלבד, עם טון מקצועי ואדיב`
        },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7, // הגדלנו בחזרה לקבלת תשובות יותר טבעיות
      max_tokens: 500
    });
    
    const botMessage = completion.choices[0].message.content;
    
    // Validate response
    if (botMessage.length > 1000 || /[^\u0590-\u05FFa-zA-Z\s.,!?;:()\-\d]/.test(botMessage)) {
      throw new Error('Invalid response generated');
    }

    res.json({ message: botMessage });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: isHebrewMessage 
        ? 'מצטערים, אירעה שגיאה. אנא נסה שוב או צור קשר עם נציג שירות.' 
        : 'Sorry, an error occurred. Please try again or contact customer service.'
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
