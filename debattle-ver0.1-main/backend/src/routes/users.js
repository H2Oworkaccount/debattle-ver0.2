const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const pool = req.app.locals.pool;

  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.avatar_url, u.created_at,
              s.wins, s.losses, s.debates_count, s.rating, s.win_rate
       FROM users u
       LEFT JOIN user_stats s ON u.id = s.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get user's debate history
router.get('/:userId/debate-history', async (req, res) => {
  const { userId } = req.params;
  const pool = req.app.locals.pool;

  try {
    const result = await pool.query(
      `SELECT d.id, d.room_id, d.topic_id, d.winner_id, d.pro_score, d.con_score,
              d.started_at, d.ended_at, d.status,
              pro.username as pro_username, con.username as con_username,
              dt.topic_text
       FROM debates d
       LEFT JOIN users pro ON d.pro_user_id = pro.id
       LEFT JOIN users con ON d.con_user_id = con.id
       LEFT JOIN debate_topics dt ON d.topic_id = dt.id
       WHERE d.pro_user_id = $1 OR d.con_user_id = $1
       ORDER BY d.created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching debate history:', err);
    res.status(500).json({ error: 'Failed to fetch debate history' });
  }
});

module.exports = router;
