import { Play, Pause, SkipForward, SkipBack, Repeat, Repeat1 } from 'lucide-react';
import { useEffect, useState } from 'react';

function MusicPlayer({ currentSong, isPlaying, currentTime, onPlayPause, onSeek, onNext, onPrevious, canControl, audioRef, repeatMode, onRepeatToggle, volume }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      const handleLoadedMetadata = () => setDuration(audioRef.current.duration || 0);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => audioRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [audioRef, currentSong]);

  useEffect(() => {
    if (audioRef.current && volume !== undefined) {
      audioRef.current.volume = volume;
    }
  }, [audioRef, volume]);

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    if (!canControl || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    onSeek(percentage * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentSong) {
    return (
      <div className="bg-black/80 backdrop-blur-md rounded-2xl border border-white/15 shadow-2xl px-4 py-3 w-[260px] md:w-[300px]">
        <div className="text-center">
          <p className="text-xs text-slate-400">No song playing</p>
          <p className="text-[10px] text-slate-500 mt-1">Add a song to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/80 backdrop-blur-md rounded-2xl border border-white/15 shadow-2xl px-4 py-2 w-[260px] md:w-[300px]">
      <div className="text-center mb-1">
        <h3 className="text-xs md:text-sm font-semibold text-white truncate px-2" title={currentSong?.title}>
          {currentSong?.title || 'No song playing'}
        </h3>
      </div>

      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-[9px] md:text-xs text-slate-400 w-7 text-right">{formatTime(currentTime)}</span>
        <div className="flex-1 w-[140px] md:w-[180px] h-1 rounded-full relative overflow-hidden cursor-pointer bg-slate-700" onClick={handleProgressClick}>
          <div className="absolute left-0 top-0 h-full transition-all bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[9px] md:text-xs text-slate-400 w-7">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-1">
        <button onClick={onRepeatToggle} disabled={!canControl} className={`p-1.5 rounded-full transition-all ${repeatMode !== 'off' ? 'text-primary' : 'text-slate-400'} hover:bg-white/10 disabled:opacity-30`}>
          {repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onPrevious} disabled={!canControl} className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-30">
          <SkipBack className="w-4 h-4" />
        </button>
        <button onClick={onPlayPause} disabled={!canControl || !currentSong} className="p-2 rounded-full bg-primary text-black hover:bg-emerald-400 transition-all disabled:opacity-30">
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>
        <button onClick={onNext} disabled={!canControl} className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-30">
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default MusicPlayer;