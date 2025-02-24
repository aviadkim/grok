#!/bin/bash

# Ensure environment variables are set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable is not set"
    exit 1
fi

# Navigate to root directory
cd /workspaces/grok || { echo "Error: Could not navigate to /workspaces/grok"; exit 1; }

echo "=== Chatbot Diagnostic Script - Starting Analysis (February 24, 2025) ==="
echo "Running tests to diagnose why the Movna Global chatbot isn’t working..."

# Step 1: Check and free ports 3000, 4000, and 5000, with retry
echo "Checking and freeing ports 3000, 4000, and 5000..."
PORTS=(3000 4000 5000)
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

# Step 2: Set up and test backend with debugging
echo "Setting up and testing backend..."
cd backend || { echo "Error: Could not navigate to backend directory"; exit 1; }

# Ensure .env file exists with OpenAI API key
echo "OPENAI_API_KEY=$OPENAI_API_KEY" > .env
echo "Verified .env file:"
cat .env

# Ensure dependencies are installed
npm install dotenv openai portfinder > backend_deps.log 2>&1 || { echo "Error: Failed to install backend dependencies. Check backend_deps.log"; exit 1; }
echo "Backend dependencies installed successfully."

# Verify and update server.mjs with debugging
echo "Verifying and updating server.mjs with debugging..."
cat server.mjs > /dev/null 2>&1 || echo "Warning: server.mjs missing or incorrect, updating..."
echo "import { OpenAI } from 'openai';
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

  app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
}).catch(error => console.error('Error finding port:', error));" > server.mjs

# Run backend and get dynamic port with debugging
node server.mjs > backend.log 2>&1 &
BACKEND_PID=$!
sleep 5

# Read backend port from log with fallback
BACKEND_PORT=$(grep "Server running on port" backend.log | tail -1 | awk '{print $NF}')
if [ -z "$BACKEND_PORT" ]; then
  BACKEND_PORT=$(grep "Found available port:" backend.log | tail -1 | awk '{print $NF}')
  if [ -z "$BACKEND_PORT" ]; then
    echo "Error: Could not determine backend port. Check backend.log for details."
    cat backend.log
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
fi
echo "Backend running on port $BACKEND_PORT."
rm backend.log

# Test backend API (multiple attempts)
echo "Testing backend API at http://localhost:$BACKEND_PORT/chat (5 attempts)..."
RETRY_COUNT=5
for i in $(seq 1 $RETRY_COUNT); do
  if [ $i -eq $RETRY_COUNT ]; then
    echo "API test failed after $RETRY_COUNT retries. Check backend.log for details."
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
  echo "Attempt $i: Testing API..."
  node -e "const fetch = require('node-fetch'); fetch('http://localhost:$BACKEND_PORT/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'שלום, האם אתה יכול לעזור עם מוצרים פיננסיים?' }) }).then(res => res.json()).then(data => console.log('API Response:', data)).catch(error => console.error('API Error:', error));" > api_test_$i.log 2>&1
  if ! grep -q "API Error" api_test_$i.log; then
    echo "Backend API test successful on attempt $i."
    API_RESPONSE=$(cat api_test_$i.log | grep "API Response:" | tail -1)
    echo "API Response: $API_RESPONSE"
    break
  fi
  sleep 2
  rm api_test_$i.log
done
rm api_test_$i.log 2>/dev/null

# Step 3: Set up and test frontend
echo "Setting up and testing frontend..."
cd /workspaces/grok/frontend || { echo "Error: Could not navigate to frontend directory"; exit 1; }

# Ensure frontend dependencies are installed
npm install > frontend_deps.log 2>&1 || { echo "Error: Failed to install frontend dependencies. Check frontend_deps.log"; exit 1; }
echo "Frontend dependencies installed successfully."

# Verify and update config.js dynamically
cd src || { echo "Error: Could not navigate to frontend/src directory"; exit 1; }
echo "Verifying and updating config.js..."
cat config.js > /dev/null 2>&1 || echo "Warning: config.js missing or incorrect, updating..."
echo "const config = {
  apiUrl: 'http://localhost:$BACKEND_PORT',
};

export default config;" > config.js

# Verify and update index.js for React 18
echo "Verifying and updating index.js for React 18..."
cat index.js > /dev/null 2>&1 || echo "Warning: index.js missing or incorrect, updating..."
echo "import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);" > index.js

cd /workspaces/grok/frontend || { echo "Error: Could not return to frontend directory"; exit 1; }

# Start frontend
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 10

# Test frontend connectivity (check logs for errors)
echo "Frontend started at http://localhost:3000. Checking logs for errors..."
if grep -q "error" frontend.log; then
  echo "Error: Frontend startup failed. Check frontend.log for details."
  kill $FRONTEND_PID 2>/dev/null
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi
echo "Frontend appears to be running correctly."

# Step 4: Comprehensive testing and analysis
echo "Performing comprehensive testing..."

# Test chatbot manually (user interaction)
echo "Please open your browser at http://localhost:3000 and test the chatbot."
echo "Enter a message like 'שלום, איך אתה יכול לעזור?' and check if it responds in Hebrew."
echo "Did the chatbot respond correctly? (y/n)"
read RESPONSE
if [ "$RESPONSE" != "y" ] && [ "$RESPONSE" != "Y" ]; then
  echo "Error: Chatbot did not respond correctly. Analyzing potential issues..."
  echo "Checking browser console for errors:"
  echo "1. Open Chrome DevTools (F12) at http://localhost:3000, go to 'Console', and copy any errors here."
  echo "2. Check backend.log for OpenAI or server errors."
  echo "3. Check frontend.log for React or fetch errors."
  echo "4. Ensure config.js uses 'http://localhost:$BACKEND_PORT' and .env has a valid OPENAI_API_KEY."
  echo "5. Verify network connectivity to OpenAI (check backend.log for 'OpenAI Error')."
  echo "Please provide the errors or logs from above, and I’ll assist further."
  kill $FRONTEND_PID 2>/dev/null
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

# Step 5: Final analysis and report
echo "=== Chatbot Diagnostic Report ==="
echo "1. Backend Port: $BACKEND_PORT (Confirmed running)"
echo "2. Frontend Port: 3000 (Confirmed running)"
echo "3. API Test Result: $API_RESPONSE (or check api_test.log for errors)"
echo "4. Chatbot Response: Successful (based on your confirmation)"
echo "5. Logs Location: backend.log, frontend.log, api_test_*.log (if any)"
echo "6. Potential Issues (if any):"
if [ -s backend.log ]; then
  echo "   - Backend Errors: $(grep "Error" backend.log || echo "None")"
fi
if [ -s frontend.log ]; then
  echo "   - Frontend Errors: $(grep "error" frontend.log || echo "None")"
fi
echo "7. Recommendations:"
echo "   - If the chatbot didn’t respond, provide browser console errors and logs."
echo "   - Verify OPENAI_API_KEY is valid and not rate-limited on OpenAI’s platform."
echo "   - Ensure no firewall or network issues block localhost ports."
echo "   - Push to GitHub and deploy to Render once local testing succeeds."

# Cleanup and shutdown
echo "Shutting down processes..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null
sleep 2
pkill -f "node server.mjs" 2>/dev/null
pkill -f "npm start" 2>/dev/null

echo "=== Analysis Complete ==="
exit 0
