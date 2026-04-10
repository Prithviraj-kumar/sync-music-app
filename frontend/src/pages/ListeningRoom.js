import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, MessageCircle, Music2, Menu, X } from 'lucide-react';
import MusicPlayer from '../components/MusicPlayer';
import VoiceChat from '../components/VoiceChat';
import TextChat from '../components/TextChat';
import ParticipantsList from '../components/ParticipantsList';
import MusicQueue from '../components/MusicQueue';
import AddMusic from '../components/AddMusic';

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
  const [queue, setQueue] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [musicVolume, setMusicVolume] = useState(1.0);
  const [isMobile, setIsMobile] = useState(false);
  const audioRef = useRef(null);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!username) { navigate('/'); return; }

    const newSocket = io(BACKEND_URL, { path: '/socket.io', transports: ['websocket', 'polling'] });

    newSocket.on('connect', () => newSocket.emit('join-room', { roomId, username }));
    
    newSocket.on('room-joined', (data) => {
      setUserId(data.userId); setRole(data.role); setParticipants(data.room.participants);
      setCurrentSong(data.room.currentSong); setIsPlaying(data.room.isPlaying);
      setCurrentTime(data.room.currentTime); setQueue(data.room.queue); setMessages(data.room.messages);
    });
    
    newSocket.on('user-joined', (data) => setParticipants(data.participants));
    newSocket.on('user-left', (data) => setParticipants(data.participants));
    newSocket.on('song-changed', (data) => { setCurrentSong(data.song); setIsPlaying(data.isPlaying); setCurrentTime(data.currentTime); if (audioRef.current && data.song) audioRef.current.currentTime = data.currentTime; });
    newSocket.on('playback-state', (data) => { setIsPlaying(data.isPlaying); setCurrentTime(data.currentTime); if (audioRef.current) { audioRef.current.currentTime = data.currentTime; if (data.isPlaying) audioRef.current.play().catch(e => console.log('Play blocked')); else audioRef.current.pause(); } });
    newSocket.on('seek', (data) => { setCurrentTime(data.time); if (audioRef.current) audioRef.current.currentTime = data.time; });
    newSocket.on('queue-updated', (data) => setQueue(data.queue));
    newSocket.on('new-message', (message) => setMessages((prev) => [...prev, message]));
    newSocket.on('participant-speaking', (data) => setParticipants(prev => prev.map(p => p.id === data.userId ? { ...p, isSpeaking: data.isSpeaking } : p)));
    newSocket.on('volume-change', ({ volume }) => { setMusicVolume(volume); if (audioRef.current) audioRef.current.volume = volume; });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [roomId, username, navigate]);

  const handlePlayPause = () => {
    if (role === 'host' || role === 'co-host') {
      const newIsPlaying = !isPlaying;
      const currentAudioTime = audioRef.current?.currentTime || currentTime;
      socket?.emit('play-pause', { isPlaying: newIsPlaying, currentTime: currentAudioTime });
      if (audioRef.current) { if (newIsPlaying) { audioRef.current.currentTime = currentAudioTime; audioRef.current.play().catch(e => console.log('Play blocked')); } else audioRef.current.pause(); }
    }
  };
  
  const handleSeek = (time) => { if (role === 'host' || role === 'co-host') { socket?.emit('seek', { time }); if (audioRef.current) audioRef.current.currentTime = time; setCurrentTime(time); } };
  const handlePlaySong = (song, index) => { if (role === 'host' || role === 'co-host') socket?.emit('play-song', { song, index }); };
  const handleAddToQueue = (song) => { if (role === 'host' || role === 'co-host') socket?.emit('add-to-queue', { song }); };
  const handleAddMultipleToQueue = (songs) => { if (role === 'host' || role === 'co-host') socket?.emit('add-multiple-to-queue', { songs }); };
  const handleRemoveFromQueue = (index) => { if (role === 'host' || role === 'co-host') socket?.emit('remove-from-queue', { index }); };
  const handleClearQueue = () => { if (role === 'host' || role === 'co-host') queue.forEach((_, idx) => socket?.emit('remove-from-queue', { index: 0 })); };
  const handlePlayNext = () => { if (role === 'host' || role === 'co-host') socket?.emit('play-next'); };
  const handlePlayPrevious = () => { if (role === 'host' || role === 'co-host') socket?.emit('play-previous'); };
  const handleRepeatToggle = () => { const modes = ['off', 'all', 'one']; const currentIndex = modes.indexOf(repeatMode); const nextMode = modes[(currentIndex + 1) % modes.length]; setRepeatMode(nextMode); socket?.emit('repeat-mode', { mode: nextMode }); };
  const handleSendMessage = (message) => socket?.emit('send-message', { message });
  const handleVoiceActivity = (isSpeaking) => socket?.emit('voice-activity', { isSpeaking, userId });
  const handleLeaveRoom = () => { socket?.disconnect(); navigate('/'); };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => { if (repeatMode === 'one') { audio.currentTime = 0; audio.play(); } else if (queue.length > 0) handlePlayNext(); };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [repeatMode, queue, handlePlayNext]);

  return (
    <div className="min-h-screen w-full bg-dark relative">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-lg z-30 p-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <Music2 className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <div>
            <h2 className="text-sm font-medium text-white">Room: {roomId?.substring(0, 8)}</h2>
            <p className="text-[10px] text-slate-400">You are {role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowChat(true)} className="p-2 rounded-full bg-white/10 text-white">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button onClick={() => setShowQueue(true)} className="p-2 rounded-full bg-white/10 text-white">
            <Menu className="w-4 h-4" />
          </button>
          <button onClick={handleLeaveRoom} className="p-2 rounded-full bg-rose-500/20 text-rose-500">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-16 pb-28 px-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          {/* Album Art Placeholder */}
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-2xl">
            {currentSong?.title ? (
              <div className="text-center p-4">
                <Music2 className="w-16 h-16 text-primary mx-auto mb-2" />
                <p className="text-xs text-slate-300 truncate">{currentSong.title}</p>
              </div>
            ) : (
              <Music2 className="w-20 h-20 text-primary/50" />
            )}
          </div>

          {/* Song Title */}
          <h3 className="text-lg md:text-xl font-semibold text-white text-center mb-4 px-4">
            {currentSong?.title || 'No song playing'}
          </h3>

          {/* Add Music Button (Only for Host/Co-Host) */}
          {(role === 'host' || role === 'co-host') && (
            <div className="w-full max-w-xs">
              <AddMusic 
                onAddSong={handlePlaySong} 
                onAddToQueue={handleAddToQueue} 
                onAddMultipleToQueue={handleAddMultipleToQueue}
              />
            </div>
          )}

          {/* Message for listeners */}
          {role === 'listener' && !currentSong && (
            <p className="text-sm text-slate-400 text-center mt-4">
              Waiting for host to add music...
            </p>
          )}
        </div>
      </div>

      {/* Music Player */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <MusicPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onNext={handlePlayNext}
          onPrevious={handlePlayPrevious}
          onRepeatToggle={handleRepeatToggle}
          repeatMode={repeatMode}
          canControl={role === 'host' || role === 'co-host'}
          audioRef={audioRef}
          volume={musicVolume}
        />
      </div>

      {/* Chat Panel (Mobile Drawer) */}
      {showChat && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg animate-slide-up">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Chat</h3>
              <button onClick={() => setShowChat(false)} className="p-2 rounded-full bg-white/10">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ParticipantsList participants={participants} userId={userId} />
              <TextChat messages={messages} onSendMessage={handleSendMessage} />
              <VoiceChat socket={socket} roomId={roomId} userId={userId} onVoiceActivity={handleVoiceActivity} />
            </div>
          </div>
        </div>
      )}

      {/* Queue Panel (Mobile Drawer) */}
      {showQueue && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg animate-slide-up">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Playlist ({queue.length})</h3>
              <button onClick={() => setShowQueue(false)} className="p-2 rounded-full bg-white/10">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MusicQueue 
                queue={queue} 
                onRemove={handleRemoveFromQueue} 
                onPlaySong={handlePlaySong} 
                onClearQueue={handleClearQueue}
                canControl={role === 'host' || role === 'co-host'} 
              />
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} src={currentSong?.url} />
    </div>
  );
}

export default ListeningRoom;