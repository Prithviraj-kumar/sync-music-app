const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/socket.io'
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, uuidv4() + '-' + file.originalname)
});
const upload = multer({ storage });

// Room storage
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
      repeatMode: 'off'
    });
  }
  return rooms.get(roomId);
}

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Join room event - FIXED: Inside io.on('connection')
  socket.on('join-room', ({ roomId, username }) => {
    const room = getRoom(roomId);
    
    let role = 'listener';
    
    console.log(`📡 User ${username} joining room ${roomId}`);
    console.log(`👥 Current participants: ${room.participants.length}`);
    
    // First user becomes HOST
    if (room.participants.length === 0) {
      role = 'host';
      room.host = socket.id;
      console.log(`👑 ${username} assigned as HOST`);
    } 
    // Second user becomes CO-HOST
    else if (room.participants.length === 1) {
      role = 'co-host';
      room.coHost = socket.id;
      console.log(`⭐ ${username} assigned as CO-HOST`);
    }
    // Everyone else becomes LISTENER
    else {
      role = 'listener';
      console.log(`🎧 ${username} assigned as LISTENER`);
    }
    
    const participant = {
      id: socket.id,
      username,
      role,
      audioEnabled: true,
      isSpeaking: false
    };
    
    room.participants.push(participant);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    
    // Send current room state to new user
    socket.emit('room-joined', {
      userId: socket.id,
      role: role,
      room: {
        participants: room.participants,
        currentSong: room.currentSong,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        queue: room.queue,
        messages: room.messages
      }
    });
    
    // Notify other users
    socket.to(roomId).emit('user-joined', {
      participants: room.participants
    });
  });

  // WebRTC signaling
  socket.on('webrtc-signal', ({ to, signal }) => {
    io.to(to).emit('webrtc-signal', { from: socket.id, signal });
  });

  // Play/Pause
  socket.on('play-pause', ({ isPlaying, currentTime }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.isPlaying = isPlaying;
      if (currentTime !== undefined) room.currentTime = currentTime;
      io.to(socket.roomId).emit('playback-state', { isPlaying, currentTime: room.currentTime });
    }
  });

  // Seek
  socket.on('seek', ({ time }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.currentTime = time;
      io.to(socket.roomId).emit('seek', { time });
    }
  });

  // Play song
  socket.on('play-song', ({ song }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      if (room.currentSong) room.playHistory.push(room.currentSong);
      room.currentSong = song;
      room.isPlaying = true;
      room.currentTime = 0;
      io.to(socket.roomId).emit('song-changed', { song, isPlaying: true, currentTime: 0 });
    }
  });

  // Add to queue
  socket.on('add-to-queue', ({ song }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.queue.push(song);
      io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
    }
  });

  // Add multiple to queue
  socket.on('add-multiple-to-queue', ({ songs }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.queue.push(...songs);
      io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
    }
  });

  // Remove from queue
  socket.on('remove-from-queue', ({ index }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.queue.splice(index, 1);
      io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
    }
  });

  // Play next
  socket.on('play-next', () => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      if (room.currentSong) room.playHistory.push(room.currentSong);
      if (room.queue.length > 0) {
        const nextSong = room.queue.shift();
        room.currentSong = nextSong;
        room.isPlaying = true;
        room.currentTime = 0;
        io.to(socket.roomId).emit('song-changed', { song: nextSong, isPlaying: true, currentTime: 0 });
        io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
      }
    }
  });

  // Play previous
  socket.on('play-previous', () => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost) && room.playHistory.length > 0) {
      const previousSong = room.playHistory.pop();
      if (room.currentSong) room.queue.unshift(room.currentSong);
      room.currentSong = previousSong;
      room.isPlaying = true;
      room.currentTime = 0;
      io.to(socket.roomId).emit('song-changed', { song: previousSong, isPlaying: true, currentTime: 0 });
      io.to(socket.roomId).emit('queue-updated', { queue: room.queue });
    }
  });

  // Repeat mode
  socket.on('repeat-mode', ({ mode }) => {
    const room = rooms.get(socket.roomId);
    if (room && (socket.id === room.host || socket.id === room.coHost)) {
      room.repeatMode = mode;
    }
  });

  // Send message
  socket.on('send-message', ({ message }) => {
    const room = rooms.get(socket.roomId);
    if (room) {
      const msg = { id: uuidv4(), username: socket.username, message, timestamp: Date.now() };
      room.messages.push(msg);
      io.to(socket.roomId).emit('new-message', msg);
    }
  });

  // Voice activity
  socket.on('voice-activity', ({ isSpeaking }) => {
    const room = rooms.get(socket.roomId);
    if (room) {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant) {
        participant.isSpeaking = isSpeaking;
        socket.to(socket.roomId).emit('participant-speaking', { userId: socket.id, isSpeaking });
        
        const anyoneSpeaking = room.participants.some(p => p.isSpeaking === true);
        const volume = anyoneSpeaking ? 0.3 : 1.0;
        io.to(socket.roomId).emit('volume-change', { volume });
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    const room = rooms.get(socket.roomId);
    if (room) {
      room.participants = room.participants.filter(p => p.id !== socket.id);
      
      if (room.host === socket.id) {
        room.host = room.participants[0]?.id || null;
        if (room.participants[0]) room.participants[0].role = 'host';
        if (room.participants[1]) room.participants[1].role = 'co-host';
      } else if (room.coHost === socket.id) {
        room.coHost = null;
        const firstListener = room.participants.find(p => p.role === 'listener');
        if (firstListener) {
          room.coHost = firstListener.id;
          firstListener.role = 'co-host';
        }
      }
      
      io.to(socket.roomId).emit('user-left', { participants: room.participants });
      if (room.participants.length === 0) rooms.delete(socket.roomId);
    }
  });
});

// Upload single file
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

// Upload multiple files
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

// Add URL song
app.post('/api/add-url', (req, res) => {
  const { url, title } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
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
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

const PORT = process.env.PORT || 8001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket path: /socket.io`);
});