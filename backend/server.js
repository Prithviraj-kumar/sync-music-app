const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/socket.io'
});

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer for multiple file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, uuidv4() + '-' + file.originalname)
});
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      participants: [],
      host: null,
      coHost: null,
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      queue: [],
      playHistory: [],
      messages: [],
      repeatMode: 'off',
      roomVolume: 1.0,
      originalVolume: 1.0
    });
  }
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, username }) => {
  const room = getRoom(roomId);
  
  console.log(`Room ${roomId} - Host: ${room.host}, CoHost: ${room.coHost}`);
  console.log(`User ${username} (${socket.id}) joining`);
  
  let role = 'listener';
  
  // Pehla user - Host
  if (room.host === null) {
    role = 'host';
    room.host = socket.id;
    console.log(`${username} assigned as HOST`);
  } 
  // Doosra user - Co-Host
  else if (room.coHost === null && room.host !== socket.id) {
    role = 'co-host';
    room.coHost = socket.id;
    console.log(`${username} assigned as CO-HOST`);
  }
  // Baaki sab - Listener
  else {
    role = 'listener';
    console.log(`${username} assigned as LISTENER`);
  }
  
  const participant = { id: socket.id, username, role, audioEnabled: true, isSpeaking: false };
  room.participants.push(participant);
  socket.join(roomId);
  socket.roomId = roomId;
  socket.username = username;
  
  socket.emit('room-joined', {
    userId: socket.id, role,
    room: {
      participants: room.participants,
      currentSong: room.currentSong,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      queue: room.queue,
      messages: room.messages
    }
  });
  socket.to(roomId).emit('user-joined', { participants: room.participants });
});

  socket.on('webrtc-signal', ({ to, signal }) => {
    io.to(to).emit('webrtc-signal', { from: socket.id, signal });
  });

  // FIX 3: Pause/Play preserves currentTime
  socket.on('play-pause', ({ isPlaying, currentTime }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.isPlaying = isPlaying;
      if (currentTime !== undefined) {
        room.currentTime = currentTime;
      }
      io.to(socket.roomId).emit('playback-state', { 
        isPlaying, 
        currentTime: room.currentTime 
      });
    }
  });

  socket.on('seek', ({ time }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.currentTime = time;
      io.to(socket.roomId).emit('seek', { time });
    }
  });

  socket.on('play-song', ({ song, index }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      if (room.currentSong) {
        room.playHistory.push(room.currentSong);
      }
      room.currentSong = song;
      room.isPlaying = true;
      room.currentTime = 0;
      
      if (index !== undefined && room.queue[index]) {
        room.queue.splice(index, 1);
      }
      
      io.to(socket.roomId).emit('song-changed', { song, isPlaying: true, currentTime: 0 });
      io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
    }
  });

  socket.on('play-previous', () => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost) && room.playHistory.length > 0) {
      const previousSong = room.playHistory.pop();
      if (room.currentSong) {
        room.queue.unshift(room.currentSong);
      }
      room.currentSong = previousSong;
      room.isPlaying = true;
      room.currentTime = 0;
      io.to(socket.roomId).emit('song-changed', { song: previousSong, isPlaying: true, currentTime: 0 });
      io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
    }
  });

  socket.on('add-to-queue', ({ song }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.queue.push(song);
      io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
    }
  });

  socket.on('add-multiple-to-queue', ({ songs }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.queue.push(...songs);
      io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
    }
  });

  socket.on('remove-from-queue', ({ index }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.queue.splice(index, 1);
      io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
    }
  });

  socket.on('play-next', () => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      if (room.currentSong) {
        room.playHistory.push(room.currentSong);
      }
      
      let nextSong = null;
      if (room.queue.length > 0) {
        nextSong = room.queue.shift();
      }
      
      if (nextSong) {
        room.currentSong = nextSong;
        room.isPlaying = true;
        room.currentTime = 0;
        io.to(socket.roomId).emit('song-changed', { song: nextSong, isPlaying: true, currentTime: 0 });
        io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
      }
    }
  });

  socket.on('repeat-mode', ({ mode }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.repeatMode = mode;
    }
  });

  // FIX 3: Voice activity - lower music volume for everyone
  socket.on('voice-activity', ({ isSpeaking, userId }) => {
    const room = rooms.get(socket.roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant) {
        participant.isSpeaking = isSpeaking;
        
        // Check if anyone is speaking
        const anyoneSpeaking = room.participants.some(p => p.isSpeaking === true);
        
        if (anyoneSpeaking) {
          room.roomVolume = 0.3;
        } else {
          room.roomVolume = 1.0;
        }
        
        io.to(socket.roomId).emit('volume-change', { volume: room.roomVolume });
        io.to(socket.roomId).emit('participant-speaking', { userId: socket.id, isSpeaking });
      }
    }
  });

  socket.on('send-message', ({ message }) => {
    const room = rooms.get(socket.roomId);
    if (room) {
      const msg = { id: uuidv4(), username: socket.username, message, timestamp: Date.now() };
      room.messages.push(msg);
      io.to(socket.roomId).emit('new-message', msg);
    }
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomId);
    if (room) {
      room.participants = room.participants.filter(p => p.id !== socket.id);
      if (room.host === socket.id) {
        room.host = room.participants[0]?.id || null;
        if (room.participants[0]) room.participants[0].role = 'host';
      } else if (room.coHost === socket.id) {
        room.coHost = null;
      }
      
      // Recheck if anyone is speaking after disconnect
      const anyoneSpeaking = room.participants.some(p => p.isSpeaking === true);
      room.roomVolume = anyoneSpeaking ? 0.3 : 1.0;
      io.to(socket.roomId).emit('volume-change', { volume: room.roomVolume });
      io.to(socket.roomId).emit('user-left', { participants: room.participants, host: room.host, coHost: room.coHost });
      
      if (room.participants.length === 0) rooms.delete(socket.roomId);
    }
  });
});

// FIX 1: Multiple file upload endpoint
app.post('/api/upload-multiple', upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const songs = req.files.map(file => ({
    id: uuidv4(),
    title: file.originalname.replace(/\.[^/.]+$/, ''),
    url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
    type: 'upload'
  }));
  
  res.json({ success: true, songs });
});

// FIX 1: Single file upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({
    success: true,
    song: {
      id: uuidv4(),
      title: req.file.originalname.replace(/\.[^/.]+$/, ''),
      url: fileUrl,
      type: 'upload'
    }
  });
});

// FIX 2: Direct URL support (MP3 only)
app.post('/api/add-url', (req, res) => {
  const { url, title } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  
  // Check if it's a valid audio URL (simple check)
  const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
  const isValid = validExtensions.some(ext => url.toLowerCase().includes(ext));
  
  if (!isValid) {
    return res.status(400).json({ 
      error: 'Invalid audio URL. Please provide direct link to .mp3, .wav, .ogg file',
      note: 'YouTube links are not supported. Use direct audio file URLs.'
    });
  }
  
  res.json({
    success: true,
    song: {
      id: uuidv4(),
      title: title || 'Online Song',
      url: url,
      type: 'url'
    }
  });
});

// Create uploads folder
if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));

const PORT = process.env.PORT || 8001;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));