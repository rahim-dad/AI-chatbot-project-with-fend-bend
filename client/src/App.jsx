import { useEffect, useRef, useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import ChatInput from './components/ChatInput.jsx';
import './App.css';

const SYSTEM_MESSAGE = {
  role: 'system',
  content: 'You must always respond in English, regardless of what language the user writes in.',
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [connection, setConnection] = useState({ status: 'checking', detail: '' });
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (res.ok && data.ok) {
        setConnection({ status: 'online', detail: `connected via ${data.provider}` });
      } else {
        setConnection({ status: 'offline', detail: data.error || 'Groq unreachable' });
      }
    } catch {
      setConnection({ status: 'offline', detail: 'Server unreachable' });
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (res.ok) {
        setModels(data.models || []);
        setSelectedModel((prev) => prev || data.models?.[0]?.name || '');
      }
    } catch {
      // health check already surfaces connection problems
    }
  }, []);

  useEffect(() => {
    checkHealth();
    loadModels();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth, loadModels]);

  const sendMessage = async (text) => {
    if (!text.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: selectedModel,
          messages: [SYSTEM_MESSAGE, ...nextMessages],
        }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          const chunk = JSON.parse(line);
          if (chunk.message?.content) {
            assistantText += chunk.message.content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantText };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'error',
            content: err.message || 'Something went wrong talking to Groq.',
          };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const clearChat = () => {
    if (isStreaming) stopStreaming();
    setMessages([]);
  };

  return (
    <div className="app-shell">
      <Sidebar
        models={models}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        connection={connection}
        onNewChat={clearChat}
        messageCount={messages.length}
      />
      <main className="chat-column">
        <ChatWindow messages={messages} isStreaming={isStreaming} />
        <ChatInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          disabled={connection.status === 'offline' || !selectedModel}
        />
      </main>
    </div>
  );
}
