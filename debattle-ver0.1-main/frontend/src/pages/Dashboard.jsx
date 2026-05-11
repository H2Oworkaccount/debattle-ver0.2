import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [stats, setStats] = useState(null);
  const [matchmaking, setMatchmaking] = useState(false);
  const [queuePosition, setQueuePosition] = useState(null);

  useEffect(() => {
    if (user) fetchUserStats();
    if (socket) {
      socket.on('queue_status', (data) => setQueuePosition(data.position));
      socket.on('matched', (data) => navigate('/debate', { state: data }));
      return () => {
        socket.off('queue_status');
        socket.off('matched');
      };
    }
  }, [socket, user, navigate]);

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/profile/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleFindOpponent = () => {
    setMatchmaking(true);
    if (socket) {
      socket.emit('join_queue', { userId: user.id, username: user.username });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!stats) return <div className="dashboard">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="navbar">
        <h1>🎤 Debattle</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
      <div className="dashboard-content">
        <div className="user-card">
          <h2>Welcome, {user.username}!</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Wins</span>
              <span className="stat-value">{stats.wins}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Losses</span>
              <span className="stat-value">{stats.losses}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Win Rate</span>
              <span className="stat-value">{stats.win_rate}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Rating</span>
              <span className="stat-value">{Math.round(stats.rating)}</span>
            </div>
          </div>
        </div>
        <div className="action-section">
          {!matchmaking ? (
            <button onClick={handleFindOpponent} className="find-opponent-btn">
              🔥 Find Opponent
            </button>
          ) : (
            <div className="matchmaking">
              <p>Finding opponent...</p>
              {queuePosition && <p>Position in queue: #{queuePosition}</p>}
              <div className="spinner"></div>
            </div>
          )}
        </div>
        <div className="quick-actions">
          <button onClick={() => navigate('/leaderboard')} className="action-btn">
            🏆 Leaderboard
          </button>
          <button onClick={() => navigate('/history')} className="action-btn">
            📜 Debate History
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;