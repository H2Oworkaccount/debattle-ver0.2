import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import './Spectator.css';

function SpectatorPage() {
  const [code, setCode] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('WAITING');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [analysisData, setAnalysisData] = useState(null);
  const [results, setResults] = useState(null);

  const { socket } = useSocket();

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('spectator_joined', handleSpectatorJoined);
    socket.on('phase_started', handlePhaseStarted);
    socket.on('phase_timer', handlePhaseTimer);
    socket.on('debate_input_received', handleDebateInputReceived);
    socket.on('intermission_analysis', handleIntermissionAnalysis);
    socket.on('debate_ended', handleDebateEnded);
    socket.on('error', (data) => setError(data.message));

    return () => {
      socket.off('spectator_joined');
      socket.off('phase_started');
      socket.off('phase_timer');
      socket.off('debate_input_received');
      socket.off('intermission_analysis');
      socket.off('debate_ended');
      socket.off('error');
    };
  }, [socket]);

  const handleSpectatorJoined = (data) => {
    setIsJoined(true);
    setRoomData(data.room);
    setError('');
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
    setAnalysisData({
      proScore: data.proScore,
      conScore: data.conScore,
      analysis: data.analysis,
    });
  };

  const handleDebateEnded = (data) => {
    setResults(data);
  };

  const handleJoinDebate = () => {
    if (!code.trim()) {
      setError('Please enter a spectator code');
      return;
    }

    if (socket) {
      socket.emit('join_as_spectator', { code: code.toUpperCase() });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const PHASE_INFO = {
    INITIAL_1: { label: '🎤 Pro Opening Arguments', color: '#e74c3c' },
    INITIAL_2: { label: '🎤 Con Opening Arguments', color: '#3498db' },
    INTERMISSION: { label: '🤖 AI Analysis', color: '#9b59b6' },
    FINAL_1: { label: '🎤 Pro Final Rebuttal', color: '#e74c3c' },
    FINAL_2: { label: '🎤 Con Final Rebuttal', color: '#3498db' },
  };

  if (results) {
    return <DebateResultsSpectator results={results} />;
  }

  if (isJoined && roomData) {
    return (
      <div className="spectator-page">
        <div className="spectator-header">
          <div className="header-info">
            <h1>🎤 Spectating Debate</h1>
            <p>Pro: {roomData.proUsername} vs Con: {roomData.conUsername}</p>
          </div>
          <div className="header-stats">
            <span className="timer">{formatTime(timeRemaining)}</span>
            <div 
              className="phase-badge"
              style={{ backgroundColor: PHASE_INFO[currentPhase]?.color || '#667eea' }}
            >
              {PHASE_INFO[currentPhase]?.label || currentPhase}
            </div>
          </div>
        </div>

        <div className="spectator-topic">
          <h2>Topic: {roomData.topic}</h2>
        </div>

        {analysisData && (
          <div className="analysis-panel">
            <h3>Current Scores</h3>
            <div className="scores">
              <div className="score-item pro">
                <span className="score-label">Pro</span>
                <span className="score-value">{Math.round(analysisData.proScore)}</span>
              </div>
              <div className="score-item con">
                <span className="score-label">Con</span>
                <span className="score-value">{Math.round(analysisData.conScore)}</span>
              </div>
            </div>
            <AnalysisDisplay analysis={analysisData.analysis} />
          </div>
        )}

        <div className="transcript-panel">
          <h3>Live Transcript</h3>
          <div className="transcript-list">
            {transcript.length === 0 ? (
              <p className="empty">Waiting for debate to start...</p>
            ) : (
              transcript.map((item, idx) => (
                <div key={idx} className="transcript-entry">
                  <span className="speaker">{item.speaker}</span>
                  <span className="time">{item.timestamp}</span>
                  <p>{item.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spectator-join">
      <div className="join-card">
        <h1>🎤 Debattle Spectator 👀</h1>
        <p className="subtitle">Enter a spectator code to watch a live debate</p>

        <div className="join-form">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinDebate()}
            placeholder="Enter spectator code"
            maxLength={6}
            className="code-input"
          />
          <button onClick={handleJoinDebate} className="join-btn">
            Watch Debate
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="info-box">
          <p>📝 Ask the debater for their spectator code to watch their debate live!</p>
        </div>
      </div>
    </div>
  );
}

function AnalysisDisplay({ analysis }) {
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
    <div className="analysis-display">
      <div className="analysis-header">
        <h4>AI Analysis</h4>
        <button onClick={speakAnalysis} className="tts-btn" title="Listen to analysis">
          {isSpeaking ? '⏸ Stop' : '🔊 Listen'}
        </button>
      </div>
      <p className="summary">{analysis.summary}</p>
    </div>
  );
}

function DebateResultsSpectator({ results }) {
  return (
    <div className="spectator-results">
      <div className="results-card">
        <h1>🏆 Debate Finished!</h1>
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
          <h3>AI Analysis</h3>
          <p>{results.analysis.summary}</p>
        </div>

        <button onClick={() => window.location.reload()} className="watch-another-btn">
          Watch Another Debate
        </button>
      </div>
    </div>
  );
}

export default SpectatorPage;
