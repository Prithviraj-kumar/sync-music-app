import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Users, Radio, Sparkles } from 'lucide-react';

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

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 10);
    setRoomId(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-full bg-primary/20 mb-4">
            <Music className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">🎵 Music Party</h1>
          <p className="text-slate-400">Listen together, chat together</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Your Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Room ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
                  placeholder="Enter room ID"
                  required
                />
                <button
                  type="button"
                  onClick={createRoom}
                  className="px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                >
                  Generate
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary text-black font-bold hover:bg-emerald-400 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" /> Join Party
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Unlimited</span>
              </div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                <span>Voice Chat</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JoinRoom;