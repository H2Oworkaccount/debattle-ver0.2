import React, { useState, useEffect, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SimplePeer from 'simple-peer';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import SpeechRecorder from '../components/SpeechRecorder';
import './Debate.css';

// Phase info mapping
const PHASE_INFO = {
  WAITING: { label: '⏳ Game Starting Soon', description: 'Waiting for both players to connect' },
  INITIAL_1: { label: '🎤 Pro Opening Arguments', description: 'Pro player presents their opening argument' },
  INITIAL_2: { label: '🎤 Con Opening Arguments', description: 'Con player presents their opening argument' },
  INTERMISSION: { label: '🤖 AI Analysis', description: 'AI judges the arguments and provides initial scores' },
  FINAL_1: { label: '🎤 Pro Final Rebuttal', description: 'Pro player delivers final rebuttal' },
  FINAL_2: { label: '🎤 Con Final Rebuttal', description: 'Con player delivers final rebuttal' },
};

function DebatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const socket = useSocket();

  const debateData = location.state;
  
  const [transcript, setTranscript] = useState([]);
  const [opponentVideo, setOpponentVideo] = useState(null);
  const [opponentLoading, setOpponentLoading] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [readySent, setReadySent] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('WAITING');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [results, setResults] = useState(null);
  const [showSpectatorPrompt, setShowSpectatorPrompt] = useState(false);
  const [spectatorCode, setSpectatorCode] = useState(null);
  const [intermissionAnalysis, setIntermissionAnalysis] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const localVideoRef = useRef(null);
  const opponentVideoRef = useRef(null);
  const peerRef = useRef(null);
  const currentPhaseRef = useRef('WAITING');
  const speechBufferRef = useRef('');

  useEffect(() => {
    if (!debateData) {
      navigate('/dashboard');
      return;
    }
    if (!socket) return;

    initializeMedia();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [socket, debateData]);

  const phaseSide = (phase) => {
    if (phase === 'INITIAL_1' || phase === 'FINAL_1') return 'pro';
    if (phase === 'INITIAL_2' || phase === 'FINAL_2') return 'con';
    return null;
  };

  const isSpeakingPhase = (phase) => ['INITIAL_1', 'INITIAL_2', 'FINAL_1', 'FINAL_2'].includes(phase);

  const flushSpeechBuffer = () => {
    const bufferedText = speechBufferRef.current.trim();
    if (!bufferedText || !socket || !debateData) return;

    console.log('Flushing speech buffer for turn:', bufferedText);
    socket.emit('debate_input', {
      roomId: debateData.roomId,
      userId: user.id,
      side: debateData.side,
      text: bufferedText,
    });

    speechBufferRef.current = '';
  };

  const handlePeerSignal = (data) => {
    console.log('Peer signal received from:', data.userId);
    if (!peerRef.current) {
      console.warn('Peer not initialized yet, dropping signal');
      return;
    }
    if (peerRef.current.destroyed) {
      console.warn('Peer destroyed, dropping signal');
      return;
    }
    if (data.userId === user.id) {
      console.log('Ignoring own signal');
      return;
    }
    try {
      console.log('Processing peer signal');
      peerRef.current.signal(data.signal);
    } catch (err) {
      console.warn('Failed to process peer signal:', err);
    }
  };

  // Socket listeners
  useEffect(() => {
    if (!socket || !debateData) return;

    console.log('Setting up socket listeners for room:', debateData.roomId);

    socket.on('phase_started', handlePhaseStarted);
    socket.on('phase_timer', handlePhaseTimer);
    socket.on('debate_input_received', handleDebateInputReceived);
    socket.on('intermission_analysis', handleIntermissionAnalysis);
    socket.on('debate_ended', handleDebateEnded);
    socket.on('peer_signal', handlePeerSignal);
    socket.on('spectator_code_created', handleSpectatorCodeCreated);
    socket.on('error', (data) => alert(data.message));

    return () => {
      socket.off('phase_started');
      socket.off('phase_timer');
      socket.off('debate_input_received');
      socket.off('intermission_analysis');
      socket.off('debate_ended');
      socket.off('peer_signal');
      socket.off('spectator_code_created');
      socket.off('error');
    };
  }, [socket, debateData]);

  // Automatically manage recording state based on turn
  useEffect(() => {
    const shouldRecord = isYourTurn() && currentPhase !== 'INTERMISSION' && currentPhase !== 'WAITING';
    if (shouldRecord) {
      speechBufferRef.current = '';
    }
    setIsRecording(shouldRecord);
  }, [currentPhase, debateData?.side]);

  useEffect(() => {
    if (socket && debateData && !readySent) {
      socket.emit('player_ready', { roomId: debateData.roomId, userId: user.id });
      setReadySent(true);
    }
  }, [socket, debateData, readySent, user.id]);

  const initializeMedia = async () => {
    try {
      console.log('Initializing media for side:', debateData.side);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log('Media obtained, creating peer');
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer
      if (peerRef.current) {
        peerRef.current.destroy();
      }

      const peer = new SimplePeer({
        initiator: debateData.side === 'pro',
        trickle: true,
        stream: stream,
      });

      peer.on('signal', (signalData) => {
        console.log('Peer signal generated, sending to backend');
        socket?.emit('peer_signal', {
          roomId: debateData.roomId,
          userId: user.id,
          signal: signalData,
        });
      });

      peer.on('stream', (stream) => {
        console.log('Opponent stream received!');
        setOpponentVideo(stream);
        setOpponentLoading(false);
        if (opponentVideoRef.current) {
          opponentVideoRef.current.srcObject = stream;
        }
      });

      peer.on('connect', () => {
        console.log('Peer connection established successfully');
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
        setOpponentLoading(true);
      });

      peerRef.current = peer;
      console.log('Peer created as:', debateData.side === 'pro' ? 'initiator' : 'non-initiator');

    } catch (err) {
      console.error('Error accessing media:', err);
      alert('Unable to access camera/microphone');
    }
  };

  const handlePhaseStarted = (data) => {
    console.log('Phase started:', data.phase, 'duration:', data.duration);

    const previousPhase = currentPhaseRef.current;
    if (
      previousPhase &&
      isSpeakingPhase(previousPhase) &&
      phaseSide(previousPhase) === debateData.side
    ) {
      flushSpeechBuffer();
    }

    currentPhaseRef.current = data.phase;
    setCurrentPhase(data.phase);
    setTimeRemaining(data.duration);
  };

  const handlePhaseTimer = (data) => {
    setTimeRemaining(data.timeRemaining);
  };

  const handleDebateInputReceived = (data) => {
    setTranscript(prev => [...prev, {
      speaker: data.username,
      text: data.text,
      timestamp: data.timestamp,
    }]);
  };

  const handleIntermissionAnalysis = (data) => {
    console.log('Intermission analysis received:', data);
    setIntermissionAnalysis({
      proScore: data.proScore,
      conScore: data.conScore,
      analysis: data.analysis,
    });
  };

  const handleDebateEnded = (data) => {
    if (isSpeakingPhase(currentPhaseRef.current) && phaseSide(currentPhaseRef.current) === debateData.side) {
      flushSpeechBuffer();
    }
    setResults(data);
  };

  const handleSpectatorCodeCreated = (data) => {
    setSpectatorCode(data.code);
  };

  const handleSubmitArgument = (argument) => {
    if (!argument.trim()) return;

    socket.emit('debate_input', {
      roomId: debateData.roomId,
      userId: user.id,
      side: debateData.side,
      text: argument,
    });
  };

  const handleSpeechTranscript = (transcript) => {
    if (!transcript.trim()) return;
    console.log('Speech transcript captured for buffer:', transcript.trim());
    speechBufferRef.current = `${speechBufferRef.current} ${transcript.trim()}`.trim();
  };

  const requestSpectatorCode = () => {
    socket.emit('request_spectator_code', {
      roomId: debateData.roomId,
      userId: user.id,
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isYourTurn = () => {
    if (currentPhase === 'INITIAL_1' || currentPhase === 'FINAL_1') return debateData.side === 'pro';
    if (currentPhase === 'INITIAL_2' || currentPhase === 'FINAL_2') return debateData.side === 'con';
    return false;
  };

  const isOpponentTurn = () => {
    if (currentPhase === 'INITIAL_1' || currentPhase === 'FINAL_1') return debateData.side === 'con';
    if (currentPhase === 'INITIAL_2' || currentPhase === 'FINAL_2') return debateData.side === 'pro';
    return false;
  };

  if (results) {
    return <DebateResults results={results} debateData={debateData} navigate={navigate} />;
  }

  return (
    <div className="debate-page">
      <div className="debate-header">
        <div className="header-left">
          <h2>Topic: {debateData.topic}</h2>
        </div>
        <div className="header-center">
          <span className="timer">{formatTime(timeRemaining)}</span>
          <span className={`phase-badge ${currentPhase.toLowerCase()}`}>
            {PHASE_INFO[currentPhase]?.label || currentPhase}
          </span>
        </div>
        <div className="header-right">
          <span className={`side ${debateData.side}`}>{debateData.side.toUpperCase()}</span>
          {!spectatorCode ? (
            <button onClick={requestSpectatorCode} className="spectator-btn" title="Enable viewers to stream this debate">
              🎥 Enable Spectators
            </button>
          ) : (
            <div className="spectator-code-display">
              <code>{spectatorCode}</code>
            </div>
          )}
        </div>
      </div>

      <div className="video-section">
        <div className={`video-container your-video ${isYourTurn() ? 'active-turn' : ''}`}>
          <video ref={localVideoRef} autoPlay muted playsInline></video>
          <span className="video-label">You ({debateData.side})</span>
        </div>

        <div className={`video-container opponent-video ${isOpponentTurn() ? 'active-turn' : ''}`}>
          {opponentLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span className="loading-text">Connecting to opponent...</span>
            </div>
          ) : (
            <video ref={opponentVideoRef} autoPlay playsInline></video>
          )}
          <span className="video-label">Opponent ({debateData.side === 'pro' ? 'con' : 'pro'})</span>
        </div>
      </div>

      {intermissionAnalysis && (
        <div className="intermission-panel">
          <h3>Intermission Analysis</h3>
          <div className="scores-display">
            <div className={`score-box pro ${intermissionAnalysis.proScore > intermissionAnalysis.conScore ? 'winning' : ''}`}>
              <span className="score-label">Pro</span>
              <span className="score-value">{Math.round(intermissionAnalysis.proScore)}</span>
            </div>
            <div className={`score-box con ${intermissionAnalysis.conScore > intermissionAnalysis.proScore ? 'winning' : ''}`}>
              <span className="score-label">Con</span>
              <span className="score-value">{Math.round(intermissionAnalysis.conScore)}</span>
            </div>
          </div>
          <AnalysisWithTTS analysis={intermissionAnalysis.analysis} isFinal={false} />
        </div>
      )}

      <div className="transcript-section">
        <h3>Debate Transcript</h3>
        <div className="transcript">
          {transcript.length === 0 ? (
            <p className="empty-transcript">Debate will start soon...</p>
          ) : (
            transcript.map((item, idx) => (
              <div key={idx} className="transcript-item">
                <span className="speaker">{item.speaker}</span>
                <span className="time">{item.timestamp}</span>
                <p>{item.text}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {isYourTurn() && currentPhase !== 'INTERMISSION' && (
        <div className="argument-input-section">
          <SpeechRecorder
            onTranscript={handleSpeechTranscript}
            isRecording={isRecording}
          />
        </div>
      )}

      {currentPhase === 'INTERMISSION' && (
        <div className="intermission-wait">
          <p>🤖 AI is analyzing the arguments...</p>
        </div>
      )}
    </div>
  );
}

function AnalysisWithTTS({ analysis, isFinal }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakAnalysis = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const text = analysis.summary || 'No analysis available';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="analysis-box">
      <div className="analysis-header">
        <h4>AI Analysis</h4>
        <button onClick={speakAnalysis} className="tts-btn" title="Listen to analysis">
          {isSpeaking ? '⏸ Stop' : '🔊 Listen'}
        </button>
      </div>
      <p className="analysis-summary">{analysis.summary}</p>
      {analysis.proStrengths && analysis.proStrengths.length > 0 && (
        <div className="analysis-section">
          <h5>💪 Pro Strengths</h5>
          <ul>
            {analysis.proStrengths.map((str, idx) => (
              <li key={idx}>{str}</li>
            ))}
          </ul>
        </div>
      )}
      {analysis.proWeaknesses && analysis.proWeaknesses.length > 0 && (
        <div className="analysis-section">
          <h5>⚠️ Pro Weaknesses</h5>
          <ul>
            {analysis.proWeaknesses.map((str, idx) => (
              <li key={idx}>{str}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DebateResults({ results, debateData, navigate }) {
  const isWinner = results.winner === 'Pro' && debateData.side === 'pro' || 
                   results.winner === 'Con' && debateData.side === 'con';

  // Convert raw scores to 0-10 scale (assuming raw scores are 0-100)
  const proScoreScaled = Math.min(10, Math.max(0, Math.round(results.proScore / 10)));
  const conScoreScaled = Math.min(10, Math.max(0, Math.round(results.conScore / 10)));

  const handleNewGame = () => {
    // Navigate back to dashboard which will trigger matchmaking
    navigate('/dashboard');
  };

  return (
    <div className="debate-results">
      <div className="results-card">
        <h1 className={isWinner ? 'winner' : 'loser'}>
          {isWinner ? '🏆 You Won!' : '💪 Good Try!'}
        </h1>
        <h2>{results.winner} Won the Debate!</h2>

        <div className="final-scores">
          <div className={`score-box pro ${results.proScore > results.conScore ? 'winning' : ''}`}>
            <span className="score-label">Pro</span>
            <span className="score-value">{proScoreScaled}/10</span>
          </div>
          <div className={`score-box con ${results.conScore > results.proScore ? 'winning' : ''}`}>
            <span className="score-label">Con</span>
            <span className="score-value">{conScoreScaled}/10</span>
          </div>
        </div>

        <div className="final-analysis">
          <AnalysisWithTTS analysis={results.analysis} isFinal={true} />
        </div>

        <div className="results-buttons">
          <button onClick={handleNewGame} className="new-game-btn">
            🎯 New Game
          </button>
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default DebatePage;