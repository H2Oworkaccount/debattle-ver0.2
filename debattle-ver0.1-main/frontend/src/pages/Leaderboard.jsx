import React, { useState, useEffect } from 'react';
import './Leaderboard.css';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard/global?limit=50');
      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="leaderboard">Loading...</div>;
  }

  return (
    <div className="leaderboard">
      <h1>🏆 Global Leaderboard</h1>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Rating</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((player, idx) => (
            <tr key={player.id} className={idx < 3 ? 'top-ranked' : ''}>
              <td>#{idx + 1}</td>
              <td>{player.username}</td>
              <td>{Math.round(player.rating)}</td>
              <td>{player.wins}</td>
              <td>{player.losses}</td>
              <td>{player.win_rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
