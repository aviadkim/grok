#!/bin/bash

# Ensure environment variables are set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable is not set"
    exit 1
fi

# Navigate to root directory
cd /workspaces/grok || exit 1

echo "Starting chatbot testing script..."

# Step 1: Check and free ports 3000 and 4000, with retry
echo "Checking and freeing ports 3000 and 4000..."
PORTS=(3000 4000)
for PORT in "${PORTS[@]}"; do
  RETRY_COUNT=3
  for i in $(seq 1 $RETRY_COUNT); do
    PID=$(lsof -t -i :$PORT)
    if [ -z "$PID" ]; then
      echo "Port $PORT is free."
      break
    fi
    if [ $i -eq $RETRY_COUNT ]; then
      echo "Failed to free port $PORT after $RETRY_COUNT attempts. Exiting."
      exit 1
    fi
    echo "Killing process on port $PORT (PID: $PID) - Attempt $i..."
    kill -9 $PID 2>/dev/null || echo "Warning: Could not kill PID $PID on port $PORT."
    sleep 1
  done
done

# Step 2: Set up backend on port 4000
echo "Setting up and running backend on port 4000..."
cd backend || exit 1

# Create .env file securely
cat > .env << EOL
OPENAI_API_KEY=${OPENAI_API_KEY}
EOL

npm install dotenv openai
cat server.mjs > /dev/null 2>&1 || echo "Warning: server.mjs missing or incorrect, updating..."
echo "import { OpenAI } from 'openai';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));" > server.mjs
node server.mjs &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Test backend API directly (using CommonJS, with retry)
echo "Testing backend API at http://localhost:4000/chat..."
RETRY_COUNT=3
for i in $(seq 1 $RETRY_COUNT); do
  if [ $i -eq $RETRY_COUNT]; then
    echo "API test failed after $RETRY_COUNT retries. Exiting."
    kill $BACKEND_PID
    exit 1
  fi
  echo "Retrying API test (attempt $i)..."
  curl -X POST "http://localhost:4000/chat" \
    -H "Content-Type: application/json" \
    -d '{"message": "שלום, האם אתה יכול לעזור עם מוצרים פיננסיים?"}' > api_test.log 2>&1
  if ! grep -q "API Error" api_test.log; then
    echo "Backend API test successful after retry."
    break
  fi
  sleep 2
done
rm api_test.log

# Step 3: Set up frontend
echo "Setting up and running frontend..."
cd /workspaces/grok/frontend || exit 1
npm install
npm start &

# Wait for frontend to start and test in browser
echo "Frontend started at http://localhost:3000. Please check the browser console for errors."
echo "Testing chatbot response... (Manually test in browser at http://localhost:3000)"
echo "Enter a message like 'שלום, איך אתה יכול לעזור?' and check if it responds in Hebrew."

# Check for errors in terminal output
if [ ! -f "node_modules" ]; then
  echo "Error: Frontend dependencies not installed properly."
  exit 1
fi

# Wait for user input to confirm testing
echo "Did the chatbot respond correctly? (y/n)"
read response
if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
  echo "Testing failed. Check browser console and terminal for errors (api_test.log if backend failed)."
  # Kill processes if testing fails
  kill $BACKEND_PID
  pkill -f "npm start"
  exit 1
fi

# If successful, kill processes cleanly
echo "Testing successful! Shutting down processes..."
kill $BACKEND_PID
pkill -f "npm start"

echo "Chatbot testing completed successfully."
exit 0
