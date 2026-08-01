import './MessageBubble.css';

const LABELS = {
  user: 'you',
  assistant: 'assistant',
  error: 'error',
};

export default function MessageBubble({ role, content, streaming }) {
  return (
    <div className={`bubble-row bubble-row--${role}`}>
      <div className={`bubble bubble--${role}`}>
        <div className="bubble-label">{LABELS[role] || role}</div>
        <div className="bubble-content">
          {content || (streaming ? '' : '')}
          {streaming && <span className="cursor" aria-hidden="true" />}
        </div>
      </div>
    </div>
  );
}
