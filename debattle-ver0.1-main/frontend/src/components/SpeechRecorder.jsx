import React, { useState, useEffect, useRef } from 'react';
import './SpeechRecorder.css';

function SpeechRecorder({ onTranscript, isRecording }) {
  const [finalTranscript, setFinalTranscript] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const processedFinalsRef = useRef(new Set());

  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError(null);
      finalTranscriptRef.current = '';
      processedFinalsRef.current = new Set();
      setFinalTranscript('');
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let addedText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;

        const bestAlternative = Array.from(result).reduce((best, alt) => {
          return alt.confidence > best.confidence ? alt : best;
        }, result[0]);

        const transcriptText = bestAlternative.transcript.trim();
        if (!transcriptText || processedFinalsRef.current.has(transcriptText)) continue;

        processedFinalsRef.current.add(transcriptText);
        addedText += `${transcriptText} `;
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcriptText}`.trim();
      }

      if (addedText.trim()) {
        setFinalTranscript(finalTranscriptRef.current);
        onTranscript?.(addedText.trim());
      }

      setTranscript(finalTranscriptRef.current);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  useEffect(() => {
    if (!isRecording) {
      setTranscript('');
      setFinalTranscript('');
      finalTranscriptRef.current = '';
      setIsListening(false);
    }

    if (isRecording && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setError('Failed to start speech recognition');
      }
    } else if (!isRecording && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isRecording, isListening]);

  return (
    <div className="speech-recorder">
      <div className="recording-status">
        {isListening ? (
          <div className="listening-indicator">
            <div className="pulse"></div>
            <span>🎤 Listening...</span>
          </div>
        ) : isRecording ? (
          <span className="preparing">🎤 Preparing to listen...</span>
        ) : (
          <span className="not-listening">⏸️ Waiting for your turn</span>
        )}
      </div>

      {transcript && (
        <div className="transcript-display">
          <p className="transcript-text">{transcript}</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}

export default SpeechRecorder;