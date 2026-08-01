import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';
import './ChatWindow.css';

export default function ChatWindow({ messages, isStreaming }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="chat-window chat-window--empty">
        <div className="empty-state">
          <span className="empty-state-mark">◈</span>
          <h1>Start a conversation</h1>
          <p>Messages are sent to Groq's free API and streamed back as they're generated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-window-inner">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          return (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              streaming={isLast && isStreaming && msg.role === 'assistant'}
            />
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
