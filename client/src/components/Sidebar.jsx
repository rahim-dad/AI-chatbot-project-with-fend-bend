import './Sidebar.css';

function formatSize(bytes) {
  if (!bytes) return '';
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB`;
}

export default function Sidebar({ models, selectedModel, onSelectModel, connection, onNewChat, messageCount }) {
  const active = models.find((m) => m.name === selectedModel);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">◈</span>
        <div>
          <div className="sidebar-brand-title">Local Chat</div>
          <div className="sidebar-brand-sub">powered by Groq (free)</div>
        </div>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        + New chat
      </button>

      <div className="sidebar-section">
        <div className="sidebar-label">Model</div>
        {models.length > 0 ? (
          <select
            className="model-select"
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="sidebar-empty">
            No models found. Check <code>GROQ_API_KEY</code> in <code>server/.env</code>.
          </div>
        )}
        {active && (
          <div className="model-meta">
            {active.parameterSize && <span>{active.parameterSize}</span>}
            {active.size && <span>{formatSize(active.size)}</span>}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Session</div>
        <div className="session-line">{messageCount} message{messageCount === 1 ? '' : 's'}</div>
      </div>

      <div className="sidebar-status">
        <span className={`status-dot status-dot--${connection.status}`} aria-hidden="true" />
        <div>
          <div className="status-text">
            {connection.status === 'online' && 'Connected'}
            {connection.status === 'offline' && 'Disconnected'}
            {connection.status === 'checking' && 'Connecting…'}
          </div>
          <div className="status-detail">{connection.detail}</div>
        </div>
      </div>
    </aside>
  );
}
