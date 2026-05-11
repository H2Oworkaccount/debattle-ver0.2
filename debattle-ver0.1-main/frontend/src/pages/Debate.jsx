import React, { useState, useEffect, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SimplePeer from 'simple-peer';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import './Debate.css';

// Phase info mapping
const PHASE_INFO = {
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
  const [localStream, setLocalStream] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('WAITING');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [results, setResults] = useState(null);
  const [showSpectatorPrompt, setShowSpectatorPrompt] = useState(false);
  const [spectatorCode, setSpectatorCode] = useState(null);
  const [intermissionAnalysis, setIntermissionAnalysis] = useState(null);

  const localVideoRef = useRef(null);
  const opponentVideoRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    if (!debateData) {
      navigate('/dashboard');
      return;
    }

    initializeMedia();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket || !debateData) return;

    socket.emit('start_debate', { roomId: debateData.roomId }); // moved here so socket is guaranteed ready

    socket.on('phase_started', handlePhaseStarted);
    socket.on('phase_timer', handlePhaseTimer);
    socket.on('debate_input_received', handleDebateInputReceived);
    socket.on('intermission_analysis', handleIntermissionAnalysis);
    socket.on('debate_ended', handleDebateEnded);
    socket.on('spectator_code_created', handleSpectatorCodeCreated);
    socket.on('error', (data) => alert(data.message));

    return () => {
      socket.off('phase_started');
      socket.off('phase_timer');
      socket.off('debate_input_received');
      socket.off('intermission_analysis');
      socket.off('debate_ended');
      socket.off('spectator_code_created');
      socket.off('error');
    };
  }, [socket]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer
      const peer = new SimplePeer({
        initiator: false,
        trickle: true,
        stream: stream,
      });

      peer.on('stream', (stream) => {
        setOpponentVideo(stream);
        if (opponentVideoRef.current) {
          opponentVideoRef.current.srcObject = stream;
        }
      });

      peerRef.current = peer;

    } catch (err) {
      console.error('Error accessing media:', err);
      alert('Unable to access camera/microphone');
    }
  };

  const handlePhaseStarted = (data) => {
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
    setIntermissionAnalysis({
      proScore: data.proScore,
      conScore: data.conScore,
      analysis: data.analysis,
    });
  };

  const handleDebateEnded = (data) => {
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
        <div className="video-container your-video">
          <video ref={localVideoRef} autoPlay muted playsInline></video>
          <span className="video-label">You ({debateData.side})</span>
          {isYourTurn() && <div className="your-turn-indicator">🔴 YOUR TURN</div>}
        </div>

        <div className="video-container opponent-video">
          <video ref={opponentVideoRef} autoPlay playsInline></video>
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
          <ArgumentSubmitter onSubmit={handleSubmitArgument} />
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

function ArgumentSubmitter({ onSubmit }) {
  const [argument, setArgument] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(argument);
    setArgument('');
  };

  return (
    <form onSubmit={handleSubmit} className="argument-form">
      <input
        type="text"
        value={argument}
        onChange={(e) => setArgument(e.target.value)}
        placeholder="Type your argument and press Enter..."
        maxLength={500}
        autoFocus
      />
      <button type="submit">Submit</button>
    </form>
  );
}

function DebateResults({ results, debateData, navigate }) {
  const isWinner = results.winner === 'Pro' && debateData.side === 'pro' || 
                   results.winner === 'Con' && debateData.side === 'con';

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
            <span className="score-value">{Math.round(results.proScore)}</span>
          </div>
          <div className={`score-box con ${results.conScore > results.proScore ? 'winning' : ''}`}>
            <span className="score-label">Con</span>
            <span className="score-value">{Math.round(results.conScore)}</span>
          </div>
        </div>

        <div className="final-analysis">
          <AnalysisWithTTS analysis={results.analysis} isFinal={true} />
        </div>

        <button onClick={() => navigate('/dashboard')} className="back-btn">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default DebatePage;