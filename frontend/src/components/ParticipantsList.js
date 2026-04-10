import { Crown, User } from 'lucide-react';

function ParticipantsList({ participants, userId }) {
  return (
    <div className="p-4 border-b border-white/5">
      <h3 className="text-xs font-semibold tracking-widest uppercase mb-3 text-slate-400">
        Participants ({participants.length})
      </h3>
      <div className="space-y-2">
        {participants.map((p) => (
          <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${p.isSpeaking ? 'ring-2 ring-primary' : ''}`}
            style={{ background: p.isSpeaking ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)', border: p.isSpeaking ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent' }}>
            <div className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10">
                <User className="w-5 h-5" style={{ color: p.isSpeaking ? '#10B981' : '#94A3B8' }} />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{p.username} {p.id === userId && '(You)'}</p>
              {p.role !== 'listener' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 w-fit">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{p.role === 'host' ? 'HOST' : 'CO-HOST'}</span>
                </div>
              )}
            </div>
            {p.isSpeaking && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ParticipantsList;