const express = require('express');
const router = express.Router();

// Get debate details
router.get('/:debateId', async (req, res) => {
  const { debateId } = req.params;
  const pool = req.app.locals.pool;

  try {
    const result = await pool.query(
      `SELECT d.*, pro.username as pro_username, con.username as con_username,
              dt.topic_text
       FROM debates d
       LEFT JOIN users pro ON d.pro_user_id = pro.id
       LEFT JOIN users con ON d.con_user_id = con.id
       LEFT JOIN debate_topics dt ON d.topic_id = dt.id
       WHERE d.id = $1`,
      [debateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching debate:', err);
    res.status(500).json({ error: 'Failed to fetch debate' });
  }
});

module.exports = router;
