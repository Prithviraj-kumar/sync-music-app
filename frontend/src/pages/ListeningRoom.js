import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, MessageCircle, Music2, Plus, Users, ListMusic, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://sync-music-app.onrender.com';

function ListeningRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;

  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState('listener');
  const [participants, setParticipants] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showAddMusic, setShowAddMusic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  
  const audioRef = useRef(null);

  useEffect(() => {
    if (!username) { navigate('/'); return; }

    const newSocket = io(BACKEND_URL, { path: '/socket.io', transports: ['websocket', 'polling'] });

    newSocket.on('connect', () => newSocket.emit('join-room', { roomId, username }));
    
    newSocket.on('room-joined', (data) => {
      console.log('Room joined:', data);
      setUserId(data.userId);
      setRole(data.role);
      setParticipants(data.room.participants);
      setCurrentSong(data.room.currentSong);
      setIsPlaying(data.room.isPlaying);
      setCurrentTime(data.room.currentTime);
      setQueue(data.room.queue);
      setMessages(data.room.messages);
    });
    
    newSocket.on('user-joined', (data) => setParticipants(data.participants));
    newSocket.on('user-left', (data) => setParticipants(data.participants));
    newSocket.on('song-changed', (data) => {
      setCurrentSong(data.song);
      setIsPlaying(data.isPlaying);
      setCurrentTime(data.currentTime);
      if (audioRef.current && data.song) {
        audioRef.current.currentTime = data.currentTime;
      }
    });
    newSocket.on('playback-state', (data) => {
      setIsPlaying(data.isPlaying);
      setCurrentTime(data.currentTime);
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime;
        if (data.isPlaying) audioRef.current.play().catch(e => console.log('Play blocked'));
        else audioRef.current.pause();
      }
    });
    newSocket.on('seek', (data) => {
      setCurrentTime(data.time);
      if (audioRef.current) audioRef.current.currentTime = data.time;
    });
    newSocket.on('queue-updated', (data) => setQueue(data.queue));
    newSocket.on('new-message', (message) => setMessages((prev) => [...prev, message]));

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [roomId, username, navigate]);

  // Playback controls
  const handlePlayPause = () => {
    if (role === 'host' || role === 'co-host') {
      const newIsPlaying = !isPlaying;
      socket?.emit('play-pause', { isPlaying: newIsPlaying, currentTime: audioRef.current?.currentTime || currentTime });
      if (audioRef.current) {
        if (newIsPlaying) audioRef.current.play().catch(e => console.log('Play blocked'));
        else audioRef.current.pause();
      }
    }
  };

  const handleSeek = (e) => {
    if (role === 'host' || role === 'co-host') {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      socket?.emit('seek', { time });
      if (audioRef.current) audioRef.current.currentTime = time;
    }
  };

  // File upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${BACKEND_URL}/api/upload`, formData);
      if (res.data.success) {
        socket?.emit('add-to-queue', { song: res.data.song });
        if (!currentSong) socket?.emit('play-song', { song: res.data.song });
      }
    } catch (err) { alert('Upload failed'); }
    finally { setUploading(false); setShowAddMusic(false); }
  };

  // URL song add
  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    try {
      const res = await axios.post(`${BACKEND_URL}/api/add-url`, { url: urlInput, title: urlTitle });
      if (res.data.success) {
        socket?.emit('add-to-queue', { song: res.data.song });
        if (!currentSong) socket?.emit('play-song', { song: res.data.song });
      }
      setUrlInput('');
      setUrlTitle('');
      setShowAddMusic(false);
    } catch (err) { alert('Failed to add URL'); }
  };

  // Play song from queue
  const handlePlaySong = (song, index) => {
    if (role === 'host' || role === 'co-host') {
      socket?.emit('play-song', { song, index });
    }
  };

  // Remove from queue
  const handleRemoveFromQueue = (index) => {
    if (role === 'host' || role === 'co-host') {
      socket?.emit('remove-from-queue', { index });
    }
  };

  // Play next
  const handlePlayNext = () => {
    if (role === 'host' || role === 'co-host') {
      socket?.emit('play-next');
    }
  };

  // Play previous
  const handlePlayPrevious = () => {
    if (role === 'host' || role === 'co-host') {
      socket?.emit('play-previous');
    }
  };

  // Send message
  const sendMessage = () => {
    if (chatInput.trim()) {
      socket?.emit('send-message', { message: chatInput });
      setChatInput('');
    }
  };

  const handleLeaveRoom = () => {
    socket?.disconnect();
    navigate('/');
  };

  // Format time
  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Audio metadata
  useEffect(() => {
    if (audioRef.current) {
      const handleLoadedMetadata = () => setDuration(audioRef.current.duration || 0);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => audioRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [currentSong]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Auto volume when speaking
  useEffect(() => {
    if (!socket) return;
    socket.on('volume-change', ({ volume }) => {
      if (audioRef.current) audioRef.current.volume = volume;
    });
    return () => socket.off('volume-change');
  }, [socket]);

  return (
    <div className="min-h-screen bg-dark pb-28">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-lg z-20 p-3 flex justify-between items-center border-b border-white/10">
        <div>
          <h2 className="text-sm font-semibold text-white">Room: {roomId?.substring(0, 8)}</h2>
          <p className="text-[10px] text-slate-400">
            {role === 'host' ? '👑 Host' : role === 'co-host' ? '⭐ Co-Host' : '🎧 Listener'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowChat(!showChat)} className="p-2 rounded-full bg-white/10">
            <MessageCircle className="w-4 h-4 text-white" />
          </button>
          <button onClick={handleLeaveRoom} className="p-2 rounded-full bg-rose-500/20">
            <LogOut className="w-4 h-4 text-rose-500" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 px-4">
        {/* Album Art */}
        <div className="flex justify-center mb-6">
          <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-2xl">
            {currentSong ? (
              <div className="text-center p-4">
                <Music2 className="w-16 h-16 text-primary mx-auto mb-2" />
                <p className="text-xs text-white font-medium truncate max-w-[160px]">{currentSong.title}</p>
              </div>
            ) : (
              <Music2 className="w-20 h-20 text-primary/40" />
            )}
          </div>
        </div>

        {/* Song Title */}
        <h3 className="text-center text-lg font-semibold text-white mb-6 px-4">
          {currentSong?.title || 'No song playing'}
        </h3>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-400 w-8">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={role !== 'host' && role !== 'co-host'}
            className="flex-1 h-1 rounded-full bg-slate-700 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
          <span className="text-xs text-slate-400 w-8">{formatTime(duration)}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <button onClick={handlePlayPrevious} disabled={role !== 'host' && role !== 'co-host'} className="p-3 rounded-full bg-white/10 disabled:opacity-30">
            <SkipBack className="w-5 h-5 text-white" />
          </button>
          <button onClick={handlePlayPause} disabled={role !== 'host' && role !== 'co-host'} className="p-4 rounded-full bg-primary disabled:opacity-30">
            {isPlaying ? <Pause className="w-6 h-6 text-black" /> : <Play className="w-6 h-6 text-black ml-0.5" />}
          </button>
          <button onClick={handlePlayNext} disabled={role !== 'host' && role !== 'co-host'} className="p-3 rounded-full bg-white/10 disabled:opacity-30">
            <SkipForward className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Add Music Button - Only for Host/Co-Host */}
        {(role === 'host' || role === 'co-host') && (
          <button
            onClick={() => setShowAddMusic(true)}
            className="w-full py-3 rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center gap-2 border border-primary/30"
          >
            <Plus className="w-5 h-5" /> Add Music
          </button>
        )}

        {/* Queue List */}
        {queue.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
              <ListMusic className="w-4 h-4" /> Queue ({queue.length})
            </h4>
            <div className="space-y-2">
              {queue.map((song, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{song.title}</p>
                    <p className="text-xs text-slate-400">#{idx + 1}</p>
                  </div>
                  {(role === 'host' || role === 'co-host') && (
                    <div className="flex gap-2">
                      <button onClick={() => handlePlaySong(song, idx)} className="p-1 rounded bg-primary/20">
                        <Play className="w-3 h-3 text-primary" />
                      </button>
                      <button onClick={() => handleRemoveFromQueue(idx)} className="p-1 rounded bg-rose-500/20">
                        <LogOut className="w-3 h-3 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" /> Participants ({participants.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <div key={p.id} className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-white">
                {p.username} {p.role === 'host' && '👑'} {p.role === 'co-host' && '⭐'} {p.id === userId && '(You)'}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Section */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-400 mb-2">Chat</h4>
          <div className="bg-white/5 rounded-xl p-3 h-48 overflow-y-auto mb-2">
            {messages.length === 0 ? (
              <p className="text-center text-slate-500 text-sm">No messages yet</p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="mb-2">
                  <span className="text-xs font-semibold text-primary">{msg.username}</span>
                  <p className="text-sm text-white break-words">{msg.message}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 rounded-full bg-white/10 text-white placeholder:text-slate-500 text-sm border border-white/10 focus:outline-none focus:border-primary"
            />
            <button onClick={sendMessage} className="px-4 py-2 rounded-full bg-primary text-black font-semibold text-sm">
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Add Music Modal */}
      {showAddMusic && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowAddMusic(false)}>
          <div className="bg-[#0B1120] rounded-2xl p-6 w-full max-w-sm border border-white/10" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-4">Add Music</h3>
            
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Upload File</label>
              <label className="block w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-center cursor-pointer">
                <input type="file" accept="audio/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                {uploading ? 'Uploading...' : '📁 Select MP3 file'}
              </label>
            </div>

            <div className="text-center text-slate-500 text-sm my-2">— OR —</div>

            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Song URL (MP3 link)</label>
              <input
                type="text"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                placeholder="Song title"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm mb-2"
              />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/song.mp3"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              />
              <button onClick={handleAddUrl} className="w-full mt-2 py-2 rounded-xl bg-primary/20 text-primary text-sm font-semibold">
                Add from URL
              </button>
            </div>

            <button onClick={() => setShowAddMusic(false)} className="w-full py-2 rounded-xl bg-white/10 text-white text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} src={currentSong?.url} />
    </div>
  );
}

export default ListeningRoom;