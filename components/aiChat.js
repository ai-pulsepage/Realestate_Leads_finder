// AI Chat Component

import { useState } from 'react';

export default function AiChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    setMessages([...messages, { text: input, user: true }, { text: data.response, user: false }]);
    setInput('');
  };

  return (
    <div>
      <div>
        {messages.map((msg, i) => <div key={i}>{msg.user ? 'You: ' : 'AI: '}{msg.text}</div>)}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}