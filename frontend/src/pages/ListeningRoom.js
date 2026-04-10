import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, MessageCircle, Music2 } from 'lucide-react';
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
  const [showChat, setShowChat] = useState(true);
  const [showQueue, setShowQueue] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [musicVolume, setMusicVolume] = useState(1.0);
  const audioRef = useRef(null);

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
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden relative bg-dark">
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="p-3 md:p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2 md:gap-3">
            <Music2 className="w-5 h-5 md:w-6 md:h-6 text-primary" strokeWidth={1.5} />
            <div>
              <h2 className="text-base md:text-xl font-medium text-white">Room: {roomId}</h2>
              <p className="text-[10px] md:text-xs text-slate-400">You are {role}</p>
            </div>
          </div>
          <button onClick={handleLeaveRoom} className="p-2 md:p-3 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all">
            <LogOut className="w-4 h-4 md:w-5 md:h-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="w-full max-w-2xl text-center">
            {(role === 'host' || role === 'co-host') && <AddMusic onAddSong={handlePlaySong} onAddToQueue={handleAddToQueue} onAddMultipleToQueue={handleAddMultipleToQueue} />}
          </div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-20">
          <div className="pointer-events-auto">
            <MusicPlayer currentSong={currentSong} isPlaying={isPlaying} currentTime={currentTime} onPlayPause={handlePlayPause} onSeek={handleSeek} onNext={handlePlayNext} onPrevious={handlePlayPrevious} onRepeatToggle={handleRepeatToggle} repeatMode={repeatMode} canControl={role === 'host' || role === 'co-host'} audioRef={audioRef} volume={musicVolume} />
          </div>
        </div>
        <audio ref={audioRef} src={currentSong?.url} />
      </div>
      <div className="w-full md:w-80 lg:w-96 h-full flex flex-col border-l border-white/10 bg-black/30 backdrop-blur-3xl">
        <div className="flex border-b border-white/5">
          <button onClick={() => { setShowChat(true); setShowQueue(false); }} className={`flex-1 py-3 md:py-4 text-sm md:text-base font-semibold transition-all ${showChat ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-white'}`}>
            <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4 inline mr-1 md:mr-2" /> Chat
          </button>
          <button onClick={() => { setShowQueue(true); setShowChat(false); }} className={`flex-1 py-3 md:py-4 text-sm md:text-base font-semibold transition-all ${showQueue ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-white'}`}>
            <Music2 className="w-3.5 h-3.5 md:w-4 md:h-4 inline mr-1 md:mr-2" /> Playlist ({queue.length})
          </button>
        </div>
        {showChat ? (
          <>
            <ParticipantsList participants={participants} userId={userId} />
            <TextChat messages={messages} onSendMessage={handleSendMessage} />
            <VoiceChat socket={socket} roomId={roomId} userId={userId} onVoiceActivity={handleVoiceActivity} />
          </>
        ) : (
          <MusicQueue queue={queue} onRemove={handleRemoveFromQueue} onPlaySong={handlePlaySong} onClearQueue={handleClearQueue} canControl={role === 'host' || role === 'co-host'} />
        )}
      </div>
    </div>
  );
}

export default ListeningRoom;