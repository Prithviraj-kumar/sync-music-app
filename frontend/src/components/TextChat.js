import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

function TextChat({ messages, onSendMessage }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="text-sm">
              <span className="font-semibold text-primary">{msg.username}</span>
              <p className="text-white mt-1">{msg.message}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/5">
        <div className="flex gap-2">
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-full border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary" />
          <button type="submit" disabled={!message.trim()} className="p-3 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: message.trim() ? '#10B981' : 'rgba(255,255,255,0.05)', color: message.trim() ? '#0B1120' : '#64748B' }}>
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default TextChat;