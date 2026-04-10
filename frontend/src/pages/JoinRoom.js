import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Users, Radio } from 'lucide-react';

function JoinRoom() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      navigate(`/room/${roomId}`, { state: { username } });
    }
  };

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 10);
    setRoomId(id);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-dark">
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Music className="w-12 h-12 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white mb-3">
            Sync Music Room
          </h1>
          <p className="text-base text-slate-400">
            Listen together, talk together, sync together
          </p>
        </div>

        <div className="p-8 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-3xl">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-2 text-slate-400">
                Your Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-2 text-slate-400">
                Room ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white"
                  placeholder="Enter or generate room ID"
                  required
                />
                <button
                  type="button"
                  onClick={generateRoomId}
                  className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-primary hover:bg-white/10 transition"
                >
                  Generate
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-6 py-4 rounded-full font-semibold bg-primary text-black hover:bg-emerald-400 transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              Join Room
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Unlimited listeners</span>
              </div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                <span>Voice chat</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JoinRoom;