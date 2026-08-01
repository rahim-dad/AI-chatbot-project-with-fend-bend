import { useRef, useState } from 'react';
import './ChatInput.css';

export default function ChatInput({ onSend, onStop, isStreaming, disabled }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleInput = (e) => {
    setValue(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const submit = () => {
    if (!value.trim() || disabled || isStreaming) return;
    onSend(value);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="chat-input-bar">
      <div className="chat-input-inner">
        {disabled && (
          <div className="chat-input-notice">
            Can't reach Groq. Check <code>GROQ_API_KEY</code> in <code>server/.env</code>, then refresh.
          </div>
        )}
        <div className="chat-input-box">
          <textarea
            ref={textareaRef}
            className="chat-input-textarea"
            placeholder="Message your local model…"
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
          />
          {isStreaming ? (
            <button className="send-btn send-btn--stop" onClick={onStop}>
              Stop
            </button>
          ) : (
            <button className="send-btn" onClick={submit} disabled={disabled || !value.trim()}>
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
