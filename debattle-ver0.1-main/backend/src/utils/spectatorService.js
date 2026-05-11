const { v4: uuidv4 } = require('uuid');

class SpectatorService {
  constructor(pool, io) {
    this.pool = pool;
    this.io = io;
  }

  // Generate a 6-character spectator code
  generateSpectatorCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create spectator code for a debate room
  async createSpectatorCode(roomId, userId) {
    try {
      const code = this.generateSpectatorCode();
      
      const result = await this.pool.query(
        `INSERT INTO spectator_codes (room_id, code, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, code, room_id`,
        [roomId, code, userId]
      );

      return result.rows[0];
    } catch (err) {
      console.error('Error creating spectator code:', err);
      throw err;
    }
  }

  // Get spectator code info by code
  async getSpectatorCodeByCode(code) {
    try {
      const result = await this.pool.query(
        `SELECT id, room_id, created_by, created_at, expires_at
         FROM spectator_codes
         WHERE code = $1 AND expires_at > NOW()`,
        [code]
      );

      return result.rows[0] || null;
    } catch (err) {
      console.error('Error fetching spectator code:', err);
      throw err;
    }
  }

  // Join as spectator
  async joinAsSpectator(code, viewerIp) {
    try {
      const spectatorCode = await this.getSpectatorCodeByCode(code);
      
      if (!spectatorCode) {
        throw new Error('Invalid or expired spectator code');
      }

      const result = await this.pool.query(
        `INSERT INTO spectators (spectator_code_id, viewer_ip)
         VALUES ($1, $2)
         RETURNING id, spectator_code_id, joined_at`,
        [spectatorCode.id, viewerIp]
      );

      return {
        spectatorId: result.rows[0].id,
        roomId: spectatorCode.room_id,
      };
    } catch (err) {
      console.error('Error joining as spectator:', err);
      throw err;
    }
  }

  // Get active spectator count for a room
  async getSpectatorCount(roomId) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) as count
         FROM spectators s
         JOIN spectator_codes sc ON s.spectator_code_id = sc.id
         WHERE sc.room_id = $1`,
        [roomId]
      );

      return result.rows[0].count;
    } catch (err) {
      console.error('Error getting spectator count:', err);
      return 0;
    }
  }

  // Broadcast debate update to spectators
  broadcaastToSpectators(roomId, event, data) {
    const spectatorNamespace = `spectators_${roomId}`;
    this.io.to(spectatorNamespace).emit(event, data);
  }

  // Get spectator room name
  getSpectatorNamespace(roomId) {
    return `spectators_${roomId}`;
  }
}

module.exports = SpectatorService;
