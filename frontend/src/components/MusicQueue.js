import { X, Music, Play } from 'lucide-react';

function MusicQueue({ queue, onRemove, onPlaySong, canControl, onClearQueue }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-semibold tracking-widest uppercase text-slate-400">Playlist ({queue.length})</h3>
        {canControl && queue.length > 0 && (
          <button onClick={onClearQueue} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear All
          </button>
        )}
      </div>
      {queue.length === 0 ? (
        <div className="text-center py-12">
          <Music className="w-12 h-12 mx-auto mb-3 text-slate-500" />
          <p className="text-sm text-slate-400">Playlist is empty</p>
          <p className="text-xs text-slate-500 mt-1">Add songs using the + button</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((song, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
              onClick={() => onPlaySong(song, idx)}>
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                <p className="text-xs text-slate-400">Click to play now</p>
              </div>
              {canControl && (
                <button onClick={(e) => { e.stopPropagation(); onRemove(idx); }} className="p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10">
                  <X className="w-4 h-4 text-rose-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MusicQueue;