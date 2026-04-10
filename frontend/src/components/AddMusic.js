import { useState } from 'react';
import { Upload, Link2, Plus, Play, ListPlus, Music } from 'lucide-react';
import { Music } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://sync-music-app.onrender.com';

function AddMusic({ onAddSong, onAddToQueue, onAddMultipleToQueue }) {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedSongs, setUploadedSongs] = useState([]);

  const handleMultipleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    try {
      const res = await axios.post(`${BACKEND_URL}/api/upload-multiple`, formData);
      if (res.data.success) setUploadedSongs(res.data.songs);
    } catch (err) { alert('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleAddUrl = async () => {
    if (!url.trim()) return;
    try {
      const res = await axios.post(`${BACKEND_URL}/api/add-url`, { url, title });
      if (res.data.success) setUploadedSongs([res.data.song]);
      setUrl(''); setTitle('');
    } catch (err) { alert('Failed to add URL'); }
  };

  const handlePlayNow = (song) => { onAddSong(song); setShowModal(false); setUploadedSongs([]); };
  const handleAddToQueue = (song) => { onAddToQueue(song); };
  const handleAddAllToQueue = () => { if (uploadedSongs.length > 0) { onAddMultipleToQueue(uploadedSongs); setShowModal(false); setUploadedSongs([]); } };

  return (
    <>
      <button onClick={() => setShowModal(true)} className="w-full px-6 py-4 rounded-full font-semibold flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/30">
        <Plus className="w-5 h-5" /> Add Music
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 bg-[#0B1120]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-medium text-white mb-4">Add Music</h2>
            <div className="flex gap-2 mb-6">
              <button onClick={() => { setActiveTab('upload'); setUploadedSongs([]); }} className={`flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-white/5 text-slate-400'}`}>
                <Upload className="w-4 h-4" /> Upload
              </button>
              <button onClick={() => { setActiveTab('url'); setUploadedSongs([]); }} className={`flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${activeTab === 'url' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-white/5 text-slate-400'}`}>
                <Link2 className="w-4 h-4" /> URL
              </button>
            </div>
            {activeTab === 'upload' ? (
              <label className="block w-full p-8 border-2 border-dashed rounded-xl text-center cursor-pointer border-white/10 hover:border-primary/50 transition-all">
                <input type="file" accept="audio/*" multiple onChange={handleMultipleFiles} disabled={uploading} className="hidden" />
                <Upload className="w-12 h-12 mx-auto mb-3 text-primary" />
                <p className="text-white">{uploading ? 'Uploading...' : 'Click to select multiple songs'}</p>
                <p className="text-xs text-slate-400 mt-1">MP3, WAV, FLAC, OGG (Select many at once)</p>
              </label>
            ) : (
              <div className="space-y-4">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white" />
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/song.mp3" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white" />
                <button onClick={handleAddUrl} disabled={!url.trim()} className="w-full px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 bg-primary text-black disabled:opacity-30">
                  <Link2 className="w-5 h-5" /> Add to Library
                </button>
              </div>
            )}
            {uploadedSongs.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-sm text-white mb-3">{uploadedSongs.length} song(s) added:</p>
                <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                  {uploadedSongs.map((song, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Music className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-white truncate">{song.title}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handlePlayNow(song)} className="p-1 rounded hover:bg-white/10" title="Play Now"><Play className="w-4 h-4 text-primary" /></button>
                        <button onClick={() => handleAddToQueue(song)} className="p-1 rounded hover:bg-white/10" title="Add to Queue"><ListPlus className="w-4 h-4 text-blue-500" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleAddAllToQueue} className="w-full px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-primary/20 text-primary border border-primary/30">
                  <ListPlus className="w-4 h-4" /> Add All {uploadedSongs.length} Songs to Queue
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AddMusic;