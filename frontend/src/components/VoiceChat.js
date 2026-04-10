import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import Peer from 'simple-peer';

function VoiceChat({ socket, roomId, userId, onVoiceActivity }) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc-signal', async ({ from, signal }) => {
      if (peersRef.current[from]) {
        peersRef.current[from].signal(signal);
      } else {
        if (!localStreamRef.current) await initLocalStream();
        const peer = new Peer({ initiator: false, trickle: false, stream: localStreamRef.current });
        peer.on('signal', (data) => socket.emit('webrtc-signal', { to: from, signal: data }));
        peer.on('stream', (stream) => {
          let audioEl = document.getElementById(`audio-${from}`);
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = `audio-${from}`;
            audioEl.autoplay = true;
            document.body.appendChild(audioEl);
          }
          audioEl.srcObject = stream;
        });
        peer.signal(signal);
        peersRef.current[from] = peer;
      }
    });

    return () => {
      socket.off('webrtc-signal');
    };
  }, [socket]);

  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkVoice = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const isSpeaking = average > 25;
        if (onVoiceActivity) onVoiceActivity(isSpeaking);
        animationFrameRef.current = requestAnimationFrame(checkVoice);
      };
      checkVoice();
      return stream;
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Cannot access microphone. Please check permissions.');
      throw err;
    }
  };

  const toggleAudio = async () => {
    if (audioEnabled) {
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      peersRef.current = {};
      setAudioEnabled(false);
      if (onVoiceActivity) onVoiceActivity(false);
    } else {
      try {
        await initLocalStream();
        setAudioEnabled(true);
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="p-3 border-t border-white/5">
      <button onClick={toggleAudio} className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm"
        style={{ background: audioEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: audioEnabled ? '#10B981' : '#F43F5E', border: `1px solid ${audioEnabled ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}` }}>
        {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        {audioEnabled ? 'Microphone On' : 'Microphone Off'}
      </button>
    </div>
  );
}

export default VoiceChat;