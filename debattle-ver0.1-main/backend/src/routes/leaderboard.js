const express = require('express');
const router = express.Router();

// Get global leaderboard
router.get('/global', async (req, res) => {
  const pool = req.app.locals.pool;
  const limit = req.query.limit || 100;

  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url,
              s.wins, s.losses, s.debates_count, s.rating, s.win_rate
       FROM user_stats s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.rating DESC, s.wins DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user rank
router.get('/rank/:userId', async (req, res) => {
  const { userId } = req.params;
  const pool = req.app.locals.pool;

  try {
    const result = await pool.query(
      `SELECT COUNT(*) + 1 as rank
       FROM user_stats
       WHERE rating > (SELECT rating FROM user_stats WHERE user_id = $1)`,
      [userId]
    );

    res.json({ userId, rank: result.rows[0].rank });
  } catch (err) {
    console.error('Error fetching user rank:', err);
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

module.exports = router;
