socket.on('join-room', ({ roomId, username }) => {
  const room = getRoom(roomId);
  
  let role = 'listener';
  
  console.log(`🔵 User ${username} joining room ${roomId}`);
  console.log(`📊 Current participants: ${room.participants.length}`);
  
  // FIRST user becomes HOST
  if (room.participants.length === 0) {
    role = 'host';
    room.host = socket.id;
    console.log(`👑 ${username} is now HOST`);
  } 
  // SECOND user becomes CO-HOST
  else if (room.participants.length === 1) {
    role = 'co-host';
    room.coHost = socket.id;
    console.log(`⭐ ${username} is now CO-HOST`);
  }
  // Everyone else becomes LISTENER
  else {
    role = 'listener';
    console.log(`🎧 ${username} is now LISTENER`);
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
  
  socket.to(roomId).emit('user-joined', {
    participants: room.participants
  });
});