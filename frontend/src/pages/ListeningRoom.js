import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  LogOut, Music2, Plus, Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, Users, MessageCircle, Mic, MicOff,
  X, ChevronUp, ChevronDown, Headphones, Crown, Star
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://sync-music-app.onrender.com';

function ListeningRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;

  // State
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
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [showQueue, setShowQueue] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const audioRef = useRef(null);

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Socket connection
  useEffect(() => {
    if (!username) { navigate('/'); return; }

    const newSocket = io(BACKEND_URL, { path: '/socket.io', transports: ['websocket', 'polling'] });

    newSocket.on('connect', () => newSocket.emit('join-room', { roomId, username }));
    
    newSocket.on('room-joined', (data) => {
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

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

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

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(false);
  };

  const toggleMute = () => setIsMuted(!isMuted);

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
      const res = await axios.post(`${BACKEND_URL}/api/add-url`, { url: urlInput, title: urlTitle || 'Online Song' });
      if (res.data.success) {
        socket?.emit('add-to-queue', { song: res.data.song });
        if (!currentSong) socket?.emit('play-song', { song: res.data.song });
      }
      setUrlInput('');
      setUrlTitle('');
      setShowAddMusic(false);
    } catch (err) { alert('Failed to add URL'); }
  };

  // Queue management
  const handlePlaySong = (song, index) => {
    if (role === 'host' || role === 'co-host') {
      socket?.emit('play-song', { song, index });
    }
  };

  const handleRemoveFromQueue = (index) => {
    if (role === 'host' || role === 'co-host') {
      socket?.emit('remove-from-queue', { index });
    }
  };

  const handlePlayNext = () => {
    if (role === 'host' || role === 'co-host') {
      socket?.emit('play-next');
    }
  };

  const handlePlayPrevious = () => {
    if (role === 'host' || role === 'co-host') {
      socket?.emit('play-previous');
    }
  };

  // Chat
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

  // Get role badge
  const getRoleBadge = (userRole) => {
    if (userRole === 'host') return <Crown className="w-3 h-3 text-yellow-500" />;
    if (userRole === 'co-host') return <Star className="w-3 h-3 text-blue-500" />;
    return <Headphones className="w-3 h-3 text-slate-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-lg z-30 p-3 flex justify-between items-center border-b border-white/10">
        <div>
          <h2 className="text-sm font-bold text-white">🎵 Music Party Room</h2>
          <p className="text-[10px] text-slate-400">Room ID - {roomId}</p>
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
      <div className="pt-16 pb-24">
        <div className="flex flex-col md:flex-row gap-4 p-4">
          
          {/* LEFT COLUMN - Playlist & Player */}
          <div className="flex-1">
            
            {/* Current Song Player */}
            <div className="bg-white/5 rounded-2xl p-4 mb-4 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                  <Music2 className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Now Playing</p>
                  <h3 className="text-base font-bold text-white truncate">
                    {currentSong?.title || 'No song playing'}
                  </h3>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-8">{formatTime(currentTime)}</span>
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                    if (role !== 'host' && role !== 'co-host') return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    handleSeek({ target: { value: percent * duration } });
                  }}>
                    <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 w-8">{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-center gap-3 mt-3">
                <button onClick={handlePlayPrevious} disabled={role !== 'host' && role !== 'co-host'} className="p-2 rounded-full bg-white/10 disabled:opacity-30">
                  <SkipBack className="w-5 h-5 text-white" />
                </button>
                <button onClick={handlePlayPause} disabled={role !== 'host' && role !== 'co-host'} className="p-3 rounded-full bg-primary disabled:opacity-30">
                  {isPlaying ? <Pause className="w-6 h-6 text-black" /> : <Play className="w-6 h-6 text-black ml-0.5" />}
                </button>
                <button onClick={handlePlayNext} disabled={role !== 'host' && role !== 'co-host'} className="p-2 rounded-full bg-white/10 disabled:opacity-30">
                  <SkipForward className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* Volume Control */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <button onClick={toggleMute} className="p-1">
                  {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 rounded-full bg-slate-700 appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Add Music Button (Host/Co-Host only) */}
            {(role === 'host' || role === 'co-host') && (
              <button
                onClick={() => setShowAddMusic(true)}
                className="w-full py-3 rounded-xl bg-primary/20 text-primary font-semibold flex items-center justify-center gap-2 border border-primary/30 mb-4"
              >
                <Plus className="w-5 h-5" /> Add Music
              </button>
            )}

            {/* PLAYLIST Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-white">🎵 PLAYLIST</h3>
                <button onClick={() => setShowQueue(!showQueue)} className="md:hidden">
                  {showQueue ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
              
              <div className={`space-y-2 ${showQueue || !isMobile ? 'block' : 'hidden'}`}>
                {queue.length === 0 ? (
                  <div className="text-center py-8 bg-white/5 rounded-xl">
                    <Music2 className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No songs in playlist</p>
                    <p className="text-slate-500 text-xs">Add music to get started</p>
                  </div>
                ) : (
                  queue.map((song, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{song.title}</p>
                          <p className="text-xs text-slate-400">#{idx + 1} • {song.type === 'upload' ? '📁 Uploaded' : '🔗 Online'}</p>
                        </div>
                        <div className="flex gap-2">
                          {(role === 'host' || role === 'co-host') && (
                            <>
                              <button onClick={() => handlePlaySong(song, idx)} className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs flex items-center gap-1">
                                <Play className="w-3 h-3" /> Play
                              </button>
                              <button onClick={() => handleRemoveFromQueue(idx)} className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-500 text-xs">
                                Remove
                              </button>
                            </>
                          )}
                          {role === 'listener' && (
                            <span className="text-xs text-slate-500">Next play</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Chat (Lyrics style) */}
          <div className={`md:w-80 ${showChat || !isMobile ? 'block' : 'hidden'}`}>
            <div className="bg-white/5 rounded-2xl backdrop-blur-sm h-full flex flex-col">
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> 💬 Chat & Lyrics
                  </h3>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400">{participants.length}</span>
                  </div>
                </div>
              </div>
              
              {/* Participants */}
              <div className="p-3 border-b border-white/10">
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10">
                      {getRoleBadge(p.role)}
                      <span className="text-xs text-white">{p.username}</span>
                      {p.id === userId && <span className="text-[10px] text-slate-400">(You)</span>}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-96">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm">No messages yet</p>
                    <p className="text-slate-600 text-xs">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary">{msg.username}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-white break-words">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>
              
              {/* Chat Input */}
              <div className="p-3 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white/10 text-white placeholder:text-slate-500 text-sm border border-white/10 focus:outline-none focus:border-primary"
                  />
                  <button onClick={sendMessage} className="px-4 py-2 rounded-xl bg-primary text-black font-semibold text-sm">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Music Modal */}
      {showAddMusic && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowAddMusic(false)}>
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Add Music</h3>
              <button onClick={() => setShowAddMusic(false)} className="p-1 rounded-full bg-white/10">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2">📁 Upload MP3 File</label>
              <label className="block w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-center cursor-pointer hover:bg-white/10 transition">
                <input type="file" accept="audio/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                {uploading ? 'Uploading...' : 'Choose file'}
              </label>
            </div>

            <div className="text-center text-slate-500 text-sm my-3">— OR —</div>

            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2">🔗 Online Song URL</label>
              <input
                type="text"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                placeholder="Song title (optional)"
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
                Add to Playlist
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-3">
              Supported: MP3, WAV, OGG (Direct links only)
            </p>
          </div>
        </div>
      )}

      <audio ref={audioRef} src={currentSong?.url} />
      
      {/* Mobile Bottom Player (when scrolling) */}
      {isMobile && currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg p-2 border-t border-white/10 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Music2 className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{currentSong.title}</p>
              <div className="w-full h-1 bg-slate-700 rounded-full mt-1">
                <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={handlePlayPause} className="p-1 rounded-full bg-primary">
                {isPlaying ? <Pause className="w-4 h-4 text-black" /> : <Play className="w-4 h-4 text-black" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListeningRoom;