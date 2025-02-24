import React, { useState, useRef, useEffect } from 'react';
import config from '../config';
import './Chat.css';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate progressive typing
  const simulateTyping = async (text) => {
    setIsTyping(true);
    let currentText = '';
    const words = text.split(' ');
    
    for (let word of words) {
      currentText += word + ' ';
      setTypingText(currentText);
      // Random delay between words (50-150ms)
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }
    setIsTyping(false);
    return text;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);
    setTypingText('');

    try {
      const response = await fetch(`${config.apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) throw new Error("שגיאת תקשורת");

      const data = await response.json();
      // Simulate typing effect
      const finalText = await simulateTyping(data.message);
      const botMessage = { role: "bot", content: finalText };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error:", error);
      setError("שגיאה בשליחת ההודעה. אנא נסה שוב.");
    } finally {
      setIsLoading(false);
      setTypingText('');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <img src="/movna-logo.png" alt="Movna Global" className="logo" />
        <h1>מוקד שירות Movna Global</h1>
      </div>

      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.role === 'bot' && <div className="bot-label">נציג שירות</div>}
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message bot typing">
            <div className="message-content">
              <div className="bot-label">נציג שירות</div>
              {typingText}
              <div className="typing-indicator">
                <span className="typing-text">typing</span>
                <div className="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="הקלד את שאלתך כאן..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          שלח
        </button>
      </form>
    </div>
  );
}
